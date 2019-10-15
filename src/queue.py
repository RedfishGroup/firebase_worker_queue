import copy
import requests


ServerTimeStamp = {".sv": "timestamp"}


def setServerTimestamp(timestamp):
    global ServerTimeStamp
    ServerTimeStamp = timestamp


STATUSES = {
    "available": "available",
    "active": "active",
    "complete": "complete",
    "error": "error",
}


class TaskException(Exception):
    def __init__(self, message, task=None):
        self.message = message
        self.task = task


def checkStatus(status):
    if not status in STATUSES:
        raise TaskException(
            'task must have status,  one of ["available", "active", "complete", "error"]')


def addTask(refURL, nTask):
    task = copy.deepcopy(nTask)
    if (not 'status' in task):
        task['status'] = STATUSES['available']
    if (not refURL):
        raise TaskException('need a valid ref')
    checkStatus(task['status'])
    if (not 'signed' in task):
        raise TaskException(
            'task needs to be signed with the current userid', task
        )

    if ('key' in task):
        raise TaskException('task already has a key: ', task)

    response = requests.post(f'{refURL}/tasks.json', json=task)
    if response.status_code != 200:
        raise TaskException(f'error adding task to firebase: {response}')
    task['key'] = response.json()['name']
    response = requests.patch(
        f'{refURL}/tasks/{task["key"]}.json', json={"key": task['key']})
    if response.status_code != 200:
        raise TaskException('error updating task key')
    requests.put(f'{refURL}/{task["status"]}/{task["key"]}.json', json=True)

    return task


def clearTask(refURL, task):
    if not refURL:
        raise TaskException('need a valid refURL')
    if not 'key' in task:
        raise TaskException('clear task requires task key', task)
    if not 'status' in task:
        raise TaskException('clear task requires task status', task)
    checkStatus(task['status'])

    response = requests.delete(f'{refURL}/{task["status"]}/{task["key"]}.json')
    if response.status_code != 200:
        raise TaskException('failed to delete task from status list', task)
    response = requests.delete(f'{refURL}/tasks/{task["key"]}.json')
    if response.status_code != 200:
        raise TaskException('failed to delete task from task list', task)
