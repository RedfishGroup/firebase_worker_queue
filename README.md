[![view on npm](http://img.shields.io/npm/v/example.svg)](https://github.com/RedfishGroup/firebase_worker_queue/)

 # Firebase job queue manager. 🔥👩‍🚒

 ### A library to facilitate the management of an in browser distributed and paralell computation environment.
 Firebase is used as the compute manager and dipatcher.

 Author: Joshua Thorp

demo : [code](https://github.com/RedfishGroup/firebase_worker_queue/blob/master/demo/pi.html), [working](https://redfishgroup.github.io/firebase_worker_queue/demo/pi.html)


## Constants

<dl>
<dt><a href="#STATUSES">STATUSES</a></dt>
<dd><p>Status constants</p>
<p>available,
active,
complete,
error</p>
</dd>
</dl>

## Functions

<dl>
<dt><a href="#setServerTimestamp">setServerTimestamp(timestamp)</a></dt>
<dd><p>Timestamp will always be firebase.database.ServerValue.TIMESTAMP</p>
<p>We didn&#39;t want firebase as a dependency, but need the constant TIMESTAMP.
This function should not be needed until firebase changes the constant.
Works for firebase 7.1.0</p>
</dd>
<dt><a href="#TaskException">TaskException(message, task)</a></dt>
<dd></dd>
<dt><a href="#checkStatus">checkStatus(status)</a></dt>
<dd><p>throws an exception if status is not a legal status</p>
</dd>
<dt><a href="#addTask">addTask(ref, nTask)</a> ⇒ <code>Promise</code></dt>
<dd><p>Add a task to the Queue for someone else to do.</p>
</dd>
<dt><a href="#clearTask">clearTask(ref, task)</a></dt>
<dd><p>Remove task from queue.</p>
</dd>
<dt><a href="#changeTaskStatus">changeTaskStatus(ref, task, newStatus, options)</a> ⇒ <code>Promise</code></dt>
<dd><p>Change the Status of a task.</p>
</dd>
<dt><a href="#claimTask">claimTask(ref, task, workerID)</a> ⇒ <code>Promise.&lt;task&gt;</code></dt>
<dd><p>Claim a task to be worked on.</p>
</dd>
<dt><a href="#completeTask">completeTask(ref, task, result)</a> ⇒ <code>Promise</code></dt>
<dd><p>Mark a task as complete, and record the result. The result will be placed in the completed task on firebase.</p>
</dd>
<dt><a href="#errorTask">errorTask(ref, task, message)</a> ⇒ <code>Promise</code></dt>
<dd><p>Mark a task as having an error.</p>
</dd>
<dt><a href="#watchQueue">watchQueue(ref, cb, status)</a></dt>
<dd><p>Fire callback when new jobs apear. You can claim them in the callback.</p>
</dd>
<dt><a href="#watchQueueAsync">watchQueueAsync(ref, cb, [status])</a></dt>
<dd><p>Watch the queue, and only accept one async task at a time.
  This will wait for the callback to finish before notifying that another task is avaliable.
  Note: This is currently slow to start with big queues</p>
</dd>
<dt><a href="#getTask">getTask(ref, status)</a> ⇒ <code>Promise</code></dt>
<dd><p>Get the most recent task of a certian status type.</p>
</dd>
<dt><a href="#taskListener">taskListener(ref, task, onComplete, onError)</a></dt>
<dd><p>Alert when a task completes or errors</p>
</dd>
<dt><a href="#taskListenerPromise">taskListenerPromise(ref, task)</a> ⇒ <code>Promise</code></dt>
<dd><p>Alert when a task completes or errors as a promise</p>
</dd>
<dt><a href="#requeueStaleActiveTasks">requeueStaleActiveTasks(ref, [expirationDuration])</a></dt>
<dd><p>Put stale active tasks back on the availabe queue</p>
</dd>
<dt><a href="#monitorForIdle">monitorForIdle(queueRef, callback, minIdleTime, watchActiveList)</a></dt>
<dd><p>Monitor avaliable tasks and call the callback when it&#39;s idle.</p>
</dd>
</dl>

## Typedefs

<dl>
<dt><a href="#ticketCallback">ticketCallback</a> : <code>function</code></dt>
<dd></dd>
<dt><a href="#watchQueueAsync">watchQueueAsync</a> : <code>function</code></dt>
<dd><p>Callback used by myFunction.</p>
</dd>
</dl>

<a name="STATUSES"></a>

## STATUSES
Status constants

available,
active,
complete,
error

**Kind**: global constant  
<a name="setServerTimestamp"></a>

## setServerTimestamp(timestamp)
Timestamp will always be firebase.database.ServerValue.TIMESTAMP

We didn't want firebase as a dependency, but need the constant TIMESTAMP.
This function should not be needed until firebase changes the constant.
Works for firebase 7.1.0

**Kind**: global function  

| Param | Type |
| --- | --- |
| timestamp | <code>firebase.database.ServerValue.TIMESTAMP</code> | 

<a name="TaskException"></a>

## TaskException(message, task)
**Kind**: global function  

| Param | Type |
| --- | --- |
| message | <code>String</code> | 
| task | <code>Task</code> | 

<a name="checkStatus"></a>

## checkStatus(status)
throws an exception if status is not a legal status

**Kind**: global function  

| Param | Type |
| --- | --- |
| status | <code>any</code> | 

<a name="addTask"></a>

## addTask(ref, nTask) ⇒ <code>Promise</code>
Add a task to the Queue for someone else to do.

**Kind**: global function  
**Returns**: <code>Promise</code> - resolves if successfull  

| Param | Type | Description |
| --- | --- | --- |
| ref | <code>FirebaseReference</code> |  |
| nTask | <code>Task</code> | It looks like this         `{ value: someValue,         signed: 'bravo-niner'} // must be signed` |

<a name="clearTask"></a>

## clearTask(ref, task)
Remove task from queue.

**Kind**: global function  

| Param | Type |
| --- | --- |
| ref | <code>FirebaseRef</code> | 
| task | <code>Task</code> | 

<a name="changeTaskStatus"></a>

## changeTaskStatus(ref, task, newStatus, options) ⇒ <code>Promise</code>
Change the Status of a task.

**Kind**: global function  
**Returns**: <code>Promise</code> - resolves(new Task), rejects(error)  

| Param | Type |
| --- | --- |
| ref | <code>FirebaseReference</code> | 
| task | <code>Task</code> | 
| newStatus | [<code>STATUSES</code>](#STATUSES) | 
| options | <code>object</code> | 

<a name="claimTask"></a>

## claimTask(ref, task, workerID) ⇒ <code>Promise.&lt;task&gt;</code>
Claim a task to be worked on.

**Kind**: global function  
**Returns**: <code>Promise.&lt;task&gt;</code> - Rejects(error) if task has already been claimed. Resolves(Task) otherwise  

| Param | Type |
| --- | --- |
| ref | <code>FirebaseReference</code> | 
| task | <code>Task</code> | 
| workerID | <code>String</code> | 

<a name="completeTask"></a>

## completeTask(ref, task, result) ⇒ <code>Promise</code>
Mark a task as complete, and record the result. The result will be placed in the completed task on firebase.

**Kind**: global function  

| Param | Type |
| --- | --- |
| ref | <code>FirebaseReference</code> | 
| task | <code>Task</code> | 
| result | <code>object</code> | 

<a name="errorTask"></a>

## errorTask(ref, task, message) ⇒ <code>Promise</code>
Mark a task as having an error.

**Kind**: global function  

| Param | Type |
| --- | --- |
| ref | <code>FirebaseRef</code> | 
| task | <code>Task</code> | 
| message | <code>String</code> | 

<a name="watchQueue"></a>

## watchQueue(ref, cb, status)
Fire callback when new jobs apear. You can claim them in the callback.

**Kind**: global function  

| Param | Type | Description |
| --- | --- | --- |
| ref | <code>FirebaseReference</code> |  |
| cb | [<code>ticketCallback</code>](#ticketCallback) | will get called when a new task apears. |
| status | [<code>STATUSES</code>](#STATUSES) |  |

<a name="watchQueueAsync"></a>

## watchQueueAsync(ref, cb, [status])
Watch the queue, and only accept one async task at a time.
  This will wait for the callback to finish before notifying that another task is avaliable.
  Note: This is currently slow to start with big queues

**Kind**: global function  

| Param | Type | Default | Description |
| --- | --- | --- | --- |
| ref | <code>FirebaseRef</code> |  |  |
| cb | [<code>watchQueueAsync</code>](#watchQueueAsync) |  | gets called with cb(error, ticket). Error is undefined hopefully. |
| [status] | [<code>STATUSES</code>](#STATUSES) | <code>STATUSES.available</code> |  |

<a name="getTask"></a>

## getTask(ref, status) ⇒ <code>Promise</code>
Get the most recent task of a certian status type.

**Kind**: global function  
**Returns**: <code>Promise</code> - resolve with a Task as the argument.  

| Param | Type |
| --- | --- |
| ref | <code>FirebaseReference</code> | 
| status | [<code>STATUSES</code>](#STATUSES) | 

<a name="taskListener"></a>

## taskListener(ref, task, onComplete, onError)
Alert when a task completes or errors

**Kind**: global function  

| Param | Type | Default | Description |
| --- | --- | --- | --- |
| ref | <code>FirebaseRef</code> |  |  |
| task | <code>Task</code> |  |  |
| onComplete | <code>function</code> | <code></code> | . Called on completion |
| onError | <code>function</code> | <code></code> | . called on error |

<a name="taskListenerPromise"></a>

## taskListenerPromise(ref, task) ⇒ <code>Promise</code>
Alert when a task completes or errors as a promise

**Kind**: global function  

| Param | Type |
| --- | --- |
| ref | <code>FirebaseRef</code> | 
| task | <code>Task</code> | 

<a name="requeueStaleActiveTasks"></a>

## requeueStaleActiveTasks(ref, [expirationDuration])
Put stale active tasks back on the availabe queue

**Kind**: global function  

| Param | Type | Default |
| --- | --- | --- |
| ref | <code>Reference</code> |  | 
| [expirationDuration] | <code>number</code> | <code>1000*60*4</code> | 

<a name="monitorForIdle"></a>

## monitorForIdle(queueRef, callback, minIdleTime, watchActiveList)
Monitor avaliable tasks and call the callback when it's idle.

**Kind**: global function  
**Access**: public  

| Param | Type | Default | Description |
| --- | --- | --- | --- |
| queueRef | <code>FirebaseRef</code> |  |  |
| callback | <code>function</code> |  |  |
| minIdleTime | <code>Number</code> | <code>60000</code> | How long to wait for idle queue |
| watchActiveList | <code>Boolean</code> | <code>false</code> | Call callback when active list is also empty. This is ooff by default |

<a name="ticketCallback"></a>

## ticketCallback : <code>function</code>
**Kind**: global typedef  

| Param | Type |
| --- | --- |
| ticket | <code>ticket</code> | 

<a name="watchQueueAsync"></a>

## watchQueueAsync : <code>function</code>
Callback used by myFunction.

**Kind**: global typedef  

| Param | Type |
| --- | --- |
| ticket | <code>Object</code> | 
| Error | <code>Object</code> | 


* * *

&copy; 2019 Redifish Group LLC