/**
 *
 * Firebase job queue manager.
 *
 * A library to facilitate the management of an in browser distributed and paralell computation environment.
 * Firebase is used as the compute manager and dipatcher.
 *
 *
 * Redfish Group LLC 2019.
 */

import {
    child,
    limitToFirst,
    push,
    off,
    onValue,
    onChildAdded,
    orderByKey,
    query,
    runTransaction,
    set,
    update,
} from 'firebase/database'

// private static value.
//  This is currently, as of Oct 2019, the current constant the firebase uses to retrive the server time.
let ServerTimeStamp = { '.sv': 'timestamp' }

/**
 *
 * Timestamp will always be firebase.database.ServerValue.TIMESTAMP
 *
 * We didn't want firebase as a dependency, but need the constant TIMESTAMP.
 * This function should not be needed until firebase changes the constant.
 * Works for firebase 7.1.0
 *
 * @param {firebase.database.ServerValue.TIMESTAMP} timestamp
 */
function setServerTimestamp(timestamp) {
    ServerTimeStamp = timestamp
}

/**
 * Status constants
 *
 * available,
 * active,
 * complete,
 * error
 *
 *
 */
const STATUSES = {
    available: 'available',
    active: 'active',
    complete: 'complete',
    error: 'error',
}

/**
 *
 * @param {String} message
 * @param {Task} task
 */
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

/**
 * Add a task to the Queue for someone else to do.
 *
 * @param {FirebaseReference} ref
 * @param {Task} nTask It looks like this   
 *      `{ value: someValue,
        signed: 'bravo-niner'} // must be signed`
 *
 * @returns {Promise} resolves if successfull
 */
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

        const taskRef = push(child(ref, 'tasks'))
        task.key = taskRef.key
        task.timeAdded = ServerTimeStamp
        set(taskRef, task)
            .then(() => {
                set(child(ref, `${task.status}/${task.key}`), true).then(() => {
                    resolve(task)
                })
            })
            .catch((e) => reject(e))
    })
}

/**
 * Remove task from queue.
 *
 * @param {FirebaseRef} ref
 * @param {Task} task
 */
function clearTask(ref, task) {
    if (!ref) throw new TaskException('need a valid ref')
    if (!task.key) throw new TaskException('clear task requires task key', task)
    checkStatus(task.status)

    set(child(ref, `${task.status}/${task.key}`), null).then(() => {
        set(child(ref, `tasks/${task.key}`), null)
    })
}

/**
 * Change the Status of a task.
 *
 * @param {FirebaseReference} ref
 * @param {Task} task
 * @param {STATUSES} newStatus
 * @param {object} options
 *
 * @returns {Promise} resolves(new Task), rejects(error)
 */
function changeTaskStatus(
    ref,
    task,
    newStatus,
    options = { workerID: null, message: null, result: null, requeue: null }
) {
    return new Promise((resolve, reject) => {
        if (!ref) throw new TaskException('need a valid ref')
        if (!task || !task.key) throw new TaskException('need a valid task')
        checkStatus(task.status)
        checkStatus(newStatus)

        const newTask = {
            ...task,
            status: newStatus,
        }

        if (options.requeue) {
            // set to null so that update erases them from firebase
            newTask['workerID'] = null
            newTask['result'] = null
            newTask['signed'] = null
        } else {
            if (task.status === newStatus) return
            if (options.workerID) newTask.workerID = options.workerID
            if (options.result) newTask.result = options.result
        }

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

        const oldRef = child(ref, `${task.status}/${task.key}`)
        const newRef = child(ref, `${newStatus}/${task.key}`)
        const taskRef = child(ref, `tasks/${task.key}`)

        onValue(oldRef, async (snap) => {
            try {
                const taskData = snap.val()
                if (!taskData) {
                    // console.log('no data found', snap.ref.toString(), task, taskData)
                    throw new TaskException('no data found', task)
                } 
                await set(oldRef, null)
                await update(taskRef, newTask)
                onValue(taskRef, async (snap) => {
                    const val2 = snap.val()
                    await set(newRef, true)
                    resolve(val2)
                })
            } catch (err) {
                reject(err)
            }
        },{onlyOnce:true})
    })
}

/**
 * Claim a task to be worked on.
 *
 * @param {FirebaseReference} ref
 * @param {Task} task
 * @param {String} workerID
 *
 * @returns {Promise<task>} Rejects(error) if task has already been claimed. Resolves(Task) otherwise
 */
function claimTask(ref, task, workerID) {
    return new Promise((resolve, reject) => {
        const taskWorkerRef = child(ref, `tasks/${task.key}/workerID`)
        runTransaction(taskWorkerRef, (currentData) => {
            if (currentData === null) {
                return workerID
            }
            console.log(`Task ${task.key} already claimed by ${currentData}`)
            return
        }).then((ev) => {
            const {committed,snapshot,error} = ev
            if (error) {
                console.log('Transaction failed abnormally!', error)
                return reject(error)
            } else if (!committed) {
                console.log(
                    'We aborted the transaction because a workerID has already been assigned'
                )
                return reject('already claimed')
            } else {
                // successfully claimed the task,  update its status
                changeTaskStatus(ref, task, STATUSES.active)
                    .then((newTask) => {
                        resolve(newTask)
                    })
                    .catch((error) => {
                        reject(error)
                    })
            }
        }).catch(reject)
    })
}

/**
 * Mark a task as complete, and record the result. The result will be placed in the completed task on firebase.
 *
 * @param {FirebaseReference} ref
 * @param {Task} task
 * @param {object} result
 *
 * @returns {Promise}
 */
function completeTask(ref, task, result) {
    return new Promise((resolve, reject) => {
        changeTaskStatus(ref, task, STATUSES.complete, { result })
            .then((newTask) => {
                resolve(newTask)
            })
            .catch((error) => {
                reject(error)
            })
    })
}

/**
 * Mark a task as having an error.
 *
 * @param {FirebaseRef} ref
 * @param {Task} task
 * @param {String} message
 *
 * @returns {Promise}
 */
function errorTask(ref, task, message) {
    return new Promise((resolve, reject) => {
        console.log('got error: ', task, message)
        changeTaskStatus(ref, task, STATUSES.error, { message })
            .then((newTask) => {
                resolve(newTask)
            })
            .catch((error) => {
                reject(error)
            })
    })
}

/**
 * Fire callback when new jobs apear. You can claim them in the callback.
 *
 * @param {FirebaseReference} ref
 * @param {ticketCallback} cb - will get called when a new task apears.
 * @param {STATUSES} status
 *
 */
function watchQueue(ref, cb, status = STATUSES.available) {
    checkStatus(status)
    onChildAdded(child(ref, status), function (snap) {
        console.log('child_added: ', { snap })
        if (snap && cb) {
            const key = snap.key
            onValue(child(ref, `tasks/${key}`), (snap) => {
                cb(snap.val())
            })
        }
    })
}

/**
 *
 * @callback ticketCallback
 * @param {ticket} ticket
 */

/**
 * Callback used by myFunction.
 * @callback watchQueueAsync
 * @param {Object} ticket
 * @param {Object} Error
 */

/**
 * Watch the queue, and only accept one async task at a time.
 *   This will wait for the callback to finish before notifying that another task is avaliable.
 *   Note: This is currently slow to start with big queues
 * @param {FirebaseRef} ref
 * @param {watchQueueAsync} cb - gets called with cb(error, ticket). Error is undefined hopefully.
 * @param {STATUSES} [status=STATUSES.available]
 *
 */
function watchQueueAsync(ref, cb, status = STATUSES.available) {
    checkStatus(status)
    onChildAdded(child(ref, status), async function (snap) {
        console.log('child_added: ', { snap })
        if (snap && cb) {
            const key = snap.key
            const taskRef = child(ref, `tasks/${key}`)
            onValue(
                taskRef,
                async (snap2) => {
                    const val = await snap2.val()
                    asyncQueue.push({ cb, val })
                    popFromAsyncQueue()
                },
                {
                    onlyOnce: true,
                }
            )
        }
    })
}

/**@private
 * @type {*} */
const asyncQueue = []
/**@private
 * @type {*} */
let busyAsyncQueue = false
/**
 * @private
 */
async function popFromAsyncQueue() {
    if (asyncQueue.length <= 0 || busyAsyncQueue === true) {
        return
    }
    const a = asyncQueue.pop()
    busyAsyncQueue = true
    try {
        await a.cb(a.val)
    } catch (err) {
        busyAsyncQueue = false
        setTimeout(popFromAsyncQueue, 0)
        cb(undefined, error)
    }
    busyAsyncQueue = false
    setTimeout(popFromAsyncQueue, 0)
}

/**
 * Get the most recent task of a certian status type.
 *
 * @param {FirebaseReference} ref
 * @param {STATUSES} status
 *
 * @returns {Promise} resolve with a Task as the argument.
 */
function getTask(ref, status = STATUSES.available) {
    if (!ref) throw new TaskException('need a valid ref')
    checkStatus(status)
    return new Promise((resolve, reject) => {
        onValue(
            query(child(ref, status), orderByKey(), limitToFirst(1)),
            (snap) => {
                if (snap.exists()) {
                    const key = Object.keys(snap.val())[0]
                    onValue(
                        ref,
                        child(`tasks/${key}/value`),
                        (snap) => {
                            resolve(snap.val())
                        },
                        { onlyOnce: true }
                    )
                } else {
                    reject('snapshot is null')
                }
            },
            { onlyOnce: true }
        )
    })
}

/**
 * Alert when a task completes or errors
 *
 * @param {FirebaseRef} ref
 * @param {Task} task
 * @param {Function} onComplete . Called on completion
 * @param {Function} onError . called on error
 */
function taskListener(ref, task, onComplete = null, onError = null) {
    const taskListenerRef = child(ref, `tasks/${task.key}`)
    const taskListener = onValue(taskListenerRef, (snap) => {
        if (!snap.exists()) {
            console.log('task does not exist, going to cancel listener')
            off(taskListenerRef, 'value', taskListener)
        }
        const task = snap.val()
        if (task.status === STATUSES.complete) {
            if (onComplete) onComplete(task)
            off(taskListenerRef, 'value', taskListener)
        }
        if (task.status === STATUSES.error) {
            if (onError) onError(task)
            off(taskListenerRef, 'value', taskListener)
        }
    })
}

/**
 * Alert when a task completes or errors as a promise
 *
 * @export
 * @param {FirebaseRef} ref
 * @param {Task} task
 * @return {Promise}
 */
function taskListenerPromise(ref, task) {
    return new Promise((resolve, reject) => {
        taskListener(
            ref,
            task,
            (a) => {
                resolve(a)
            },
            (err) => {
                reject(err)
            }
        )
    })
}

/**
 * Put stale active tasks back on the availabe queue
 *
 * @param {Reference} ref
 * @param {number} [expirationDuration=1000*60*4]
 * @param {STATUSES} status Usually this will be active but ocasionally one might want to run this on available
 */
async function requeueStaleActiveTasks(
    ref,
    expirationDuration = 1000 * 60 * 4,
    status = STATUSES.active
) {
    onValue(
        child(ref,status),
        (actSnap) => {
            const actVal = actSnap.val()
            for (let i in actVal) {
                onValue(child(ref, `tasks/${i}`), (taskSnap) => {
                    const taskVal = taskSnap.val()
                    if (taskVal) {
                        const time = new Date(taskVal.timeStarted)
                        const now = new Date()
                        if (now - time > expirationDuration) {
                            changeTaskStatus(ref, taskVal, STATUSES.available, {
                                requeue: true,
                            })
                        }
                    }
                })
            }
        },
        { onlyOnce: true }
    )
}

/**
 * Occassionaly the queue will get blocked by an avaliable but claimed task. I am not sure what causes this.
 * This will remove the worker ID so it can once again work.
 * This is not fast!
 * @param {Reference} ref
 * @param {Number} limitToFirst. The higher the numnber the more thurough amd slow the search is. It is usually the first one that is the problem in my experience
 */
async function requeueAvaliableButClaimedTasks(ref, limitToFirst = 10) {
    onValue(
        query(
            child(ref, STATUSES.available),
            orderByKey(),
            limitToFirst(limitToFirst)
        ),
        (avalSnap) => {
            const avalVals = avalSnap.val()

            if (!avalVals) return // empty queue...all done

            Object.keys(avalVals).forEach(async (id) => {
                onValue(
                    child(ref, `tasks/${id}`),
                    (taskSnap) => {
                        const val = taskSnap.val()
                        console.log('val', val)
                        if (val.workerID) {
                            set(child(ref, `tasks/${id}/workerID`), null)
                        }
                    },
                    { onlyOnce: true }
                )
            })
        },
        { onlyOnce: true }
    )
}

/**
 * Monitor avaliable tasks and call the callback when it's idle.
 *
 * @public
 * @param {FirebaseRef} queueRef
 * @param {function} callback
 * @param {Number} minIdleTime - How long to wait for idle queue
 * @param {Boolean} watchActiveList - Call callback when active list is also empty. This is ooff by default
 */
function monitorForIdle(
    queueRef,
    callback,
    minIdleTime = 60000,
    watchActiveList = false
) {
    let timeoutID = undefined
    function innerCallback(snap) {
        clearTimeout(timeoutID)
        timeoutID = undefined
        const count = snap.numChildren()
        if (count === 0) {
            timeoutID = setTimeout(callback, minIdleTime)
        }
    }
    onValue(child(queueRef, 'available'), async (snap) => {
        innerCallback(snap)
    })

    if (watchActiveList) {
        onValue(child(queueRef, 'active'), async (snap) => {
            innerCallback(snap)
        })
    }
}

export {
    STATUSES,
    TaskException,
    addTask,
    clearTask,
    getTask,
    changeTaskStatus,
    watchQueue,
    watchQueueAsync,
    claimTask,
    completeTask,
    errorTask,
    taskListener,
    taskListenerPromise,
    setServerTimestamp,
    requeueStaleActiveTasks,
    requeueAvaliableButClaimedTasks,
    monitorForIdle
}
