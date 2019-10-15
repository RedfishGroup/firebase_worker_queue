let ServerTimeStamp = { '.sv': 'timestamp' }

function setServerTimestamp(timestamp) {
    ServerTimeStamp = timestamp
}

const STATUSES = {
    available: 'available',
    active: 'active',
    complete: 'complete',
    error: 'error',
}

function TaskException(message, task) {
    this.message = message
    this.task = task
    this.name = 'TaskException'
}

/**
 *
 * throws an exception if status is not a legal status
 *
 * @param {any} status
 */
function checkStatus(status) {
    if (!STATUSES[status])
        throw new TaskException(
            'task must have status,  one of ["available", "active", "complete", "error"]'
        )
}

function addTask(ref, nTask) {
    return new Promise((resolve, reject) => {
        console.log('adding task: ', ref, nTask)
        const task = { ...nTask }
        if (!task.status) task.status = STATUSES.available
        if (!ref) throw new TaskException('need a valid ref')
        checkStatus(task.status)
        if (!task.signed) {
            throw new TaskException(
                'task needs to be signed with the current userid',
                task
            )
        }
        if (task.key) throw new TaskException('task already has a key: ', task)

        const taskRef = ref.child('tasks').push()
        task.key = taskRef.key
        task.timeAdded = ServerTimeStamp
        taskRef
            .set(task)
            .then(() => {
                ref.child(task.status)
                    .child(task.key)
                    .set(true)
                    .then(() => {
                        resolve(task)
                    })
            })
            .catch(e => reject(e))
    })
}

function clearTask(ref, task) {
    if (!ref) throw new TaskException('need a valid ref')
    if (!task.key) throw new TaskException('clear task requires task key', task)
    checkStatus(task.status)

    ref.child(task.status)
        .child(task.key)
        .set(null)
        .then(() => {
            ref.child('tasks')
                .child(task.key)
                .set(null)
        })
}

function changeTaskStatus(
    ref,
    task,
    newStatus,
    options = { workerID: null, message: null, result: null }
) {
    return new Promise((resolve, reject) => {
        if (!ref) throw new TaskException('need a valid ref')
        if (!task || !task.key) throw new TaskException('need a valid task')
        checkStatus(task.status)
        checkStatus(newStatus)
        if (task.status === newStatus) return

        const newTask = {
            ...task,
            status: newStatus,
        }

        if (options.workerID) newTask.workerID = options.workerID
        if (options.result) newTask.result = options.result

        if (newStatus === STATUSES.active) {
            newTask.timeStarted = ServerTimeStamp
        } else if (
            newStatus === STATUSES.complete ||
            newStatus === STATUSES.error
        ) {
            newTask.timeEnded = ServerTimeStamp
        } else if (
            newStatus === STATUSES.available &&
            (task.status === STATUSES.error || task.status === STATUSES.active)
        ) {
            // transitioning into available from error or active state
            newTask.timeAdded = ServerTimeStamp
        }

        if (options.message) {
            newTask.history = task.history || []
            newTask.history.push({
                timestamp: ServerTimeStamp,
                message: options.message,
            })
        }

        const oldRef = ref.child(task.status).child(task.key)
        const newRef = ref.child(newStatus).child(task.key)
        const taskRef = ref.child('tasks').child(task.key)

        oldRef
            .once('value')
            .then(snap => {
                const taskData = snap.val()
                if (!taskData) throw new TaskException('no data found', task)
                oldRef
                    .set(null)
                    .then(() => {
                        taskRef
                            .update(newTask)
                            .then(() => {
                                newRef
                                    .set(true)
                                    .then(() => {
                                        resolve(newTask)
                                    })
                                    .catch(error => reject(error))
                            })
                            .catch(error => reject(error))
                    })
                    .catch(error => reject(error))
            })
            .catch(error => reject(error))
    })
}

function claimTask(ref, task, workerID) {
    return new Promise((resolve, reject) => {
        const taskWorkerRef = ref
            .child('tasks')
            .child(task.key)
            .child('workerID')
        taskWorkerRef.transaction(
            currentData => {
                if (currentData === null) {
                    return workerID
                }
                console.log(
                    `Task ${task.key} already claimed by ${currentData}`
                )
                return
            },
            (error, committed, snap) => {
                if (error) {
                    console.log('Transaction failed abnormally!', error)
                } else if (!committed) {
                    console.log(
                        'We aborted the transaction because a workerID has already been assigned'
                    )
                } else {
                    // successfully claimed the task,  update its status
                    changeTaskStatus(ref, task, STATUSES.active)
                        .then(newTask => {
                            resolve(newTask)
                        })
                        .catch(error => {
                            reject(error)
                        })
                }
            },
            false
        )
    })
}

function completeTask(ref, task, result) {
    return new Promise((resolve, reject) => {
        changeTaskStatus(ref, task, STATUSES.complete, { result })
            .then(newTask => {
                resolve(newTask)
            })
            .catch(error => {
                reject(error)
            })
    })
}

function errorTask(ref, task, message) {
    return new Promise((resolve, reject) => {
        console.log('got error: ', task, message)
        changeTaskStatus(ref, task, STATUSES.error, { message })
            .then(newTask => {
                resolve(newTask)
            })
            .catch(error => {
                reject(error)
            })
    })
}

function watchQueue(ref, cb, status = STATUSES.available) {
    checkStatus(status)
    ref.child(status).on('child_added', function(snap) {
        console.log('child_added: ', { snap })
        if (snap && cb) {
            const key = snap.key
            ref.child('tasks')
                .child(key)
                .once('value')
                .then(snap => {
                    cb(snap.val())
                })
        }
    })
}

function getTask(ref, status = STATUSES.available) {
    if (!ref) throw new TaskException('need a valid ref')
    checkStatus(status)
    return new Promise((resolve, reject) => {
        ref.child(status)
            .orderByKey()
            .limitToFirst(1)
            .once('value', snap => {
                if (snap.exists()) {
                    ref.child('tasks')
                        .child(snap.key)
                        .once('value')
                        .then(snap => {
                            resolve(snap.val())
                        })
                }
            })
    })
}

function taskListener(ref, task, onComplete = null, onError = null) {
    const taskListenerRef = ref.child('tasks').child(task.key)
    const taskListener = taskListenerRef.on(
        'value',
        snap => {
            if (!snap.exists()) {
                console.log('task does not exist, going to cancel listener')
                taskListenerRef.off('value', taskListener)
            }
            const task = snap.val()
            if (task.status === STATUSES.complete) {
                if (onComplete) onComplete(task)
                taskListenerRef.off('value', taskListener)
            }
            if (task.status === STATUSES.error) {
                if (onError) onError(task)
                taskListenerRef.off('value', taskListener)
            }
        },
        error => {
            console.log('GOT ERROR: ', error)
        }
    )
}

export {
    STATUSES,
    TaskException,
    addTask,
    clearTask,
    getTask,
    changeTaskStatus,
    watchQueue,
    claimTask,
    completeTask,
    errorTask,
    taskListener,
    setServerTimestamp,
}
