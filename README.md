# firebase_worker_queue

Firebase job queue manager.
A library to facilitate the management of an in browser distributed and paralell computation environment.
Firebase is used as the compute manager and dipatcher.
It is suited for jobs with very little data throughput but large computation overheads.

Redfish Group LLC 2019.


# Documentation

## `function setServerTimestamp(timestamp)`

Timestamp will always be firebase.database.ServerValue.TIMESTAMP

We didn't want firebase as a dependency, but need the constant TIMESTAMP. This function should not be needed until firebase changes the constant. Works for firebase 7.1.0

 * **Parameters:** `timestamp` — `firebase.database.ServerValue.TIMESTAMP` — 

## `const STATUSES =`

Status constants

## `function TaskException(message, task)`

 * **Parameters:**
   * `message` — `String` — 
   * `task` — `Task` — 

## `function checkStatus(status)`

throws an exception if status is not a legal status

 * **Parameters:** `status` — `any` — 

## `function addTask(ref, nTask)`

Add a task to the Queue for someone else to do.

 * **Parameters:**
   * `{Firebase` — ref
   * `nTask` — `Task` — 

## `function clearTask(ref, task)`

Remove task from queue.

 * **Parameters:**
   * `{Firebase` — ref
   * `task` — `Task` — 

## `function changeTaskStatus( ref, task, newStatus, options =`

Change the Status of a task.

 * **Parameters:**
   * `{Firebase` — ref
   * `task` — `Task` — 
   * `newStatus` — `STATUSES` — 
   * `options` — `object` — 

## `function claimTask(ref, task, workerID)`

Claim a task to be worked on.

 * **Parameters:**
   * `{Firebase` — ref
   * `task` — `Task` — 
   * `workerID` — `String` — <p>
 * **Returns:** `Promise` — Rejects(error) if task has already been claimed. Resolves(Task) otherwise

## `function completeTask(ref, task, result)`

Mark a task as complete, and potentially record the result.

 * **Parameters:**
   * `{Firebase` — ref
   * `task` — `Task` — 
   * `result` — `object` — 

## `function errorTask(ref, task, message)`

Mark a task as having an error.

 * **Parameters:**
   * `{Firebase` — ref
   * `task` — `Task` — 
   * `message` — `String` — 

## `function watchQueue(ref, cb, status = STATUSES.available)`

Fire callback when new jobs apear. You can claim them in the callback.

 * **Parameters:**
   * `{Firebase` — ref
   * `cb,` — `function` — will get called when a new task apears.
   * `status` — `STATUSES` — 

## `function getTask(ref, status = STATUSES.available)`

Get the most recent task of a certian status type.

 * **Parameters:**
   * `{Firebase` — ref
   * `status` — `STATUSES` — 

## `function taskListener(ref, task, onComplete = null, onError = null)`

Alert when a task completes or errors

 * **Parameters:**
   * `{Firebase` — ref
   * `task` — `Task` — 
   * `onComplete` — `Function` — . Called on completion
   * `onError` — `Function` — . called on error
