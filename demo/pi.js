import * as Q from '../src/queue.js'

import 'https://www.gstatic.com/firebasejs/9.6.2/firebase-app-compat.js'
import 'https://www.gstatic.com/firebasejs/9.3.0/firebase-database-compat.js'



/**
 * Throw a dart at a board. If it is in a circle return true
 *   The area of the circle in a 1x1 box is π/4. So the change of randomly landing in the circle is also π/4.
 *
 *
 * */
function sample() {
    const x = Math.random() - 0.5
    const y = Math.random() - 0.5
    const dist = Math.hypot(x, y)
    return dist <= 0.5
}

function sampleNTimes(n) {
    let sum = 0
    for (let i = 0; i < n; i++) {
        sum = sum + sample() * 1
    }
    return { sum, n, ratio: sum / n }
}

const timeoutDelay = (ms) => new Promise((res) => setTimeout(res, ms))

/**
 * This flavor of the function manages to not block the main thread.
 *
 * */
async function sampleNTimesAsync(n = 100000, sampletSize = 1000000) {
    let count = n
    let sum = 0
    while (count > 0) {
        const s = Math.min(sampletSize, count)
        const res = sampleNTimes(s)
        sum += res.sum
        await timeoutDelay(0)
        count = count - s
    }
    return { sum, n, ratio: sum / n }
}

/**
 * Worker Queue portion
 *
 * */
var app = firebase.initializeApp({
    apiKey: 'AIzaSyCKuD19DkUeHtEawjVB5IPCXSqe5lkaWIY',
    databaseURL: 'https://workerqueuedemo.firebaseio.com/',
    projectId: 'workerqueuedemo',
})
const db = app.database()
const ref = db.ref().child('demo').child('pi')

var stateForUI = 'idle'
let sum = 0
let count = 0
updateUI()

Q.watchQueueAsync(ref, async (task) => {
    try {
        stateForUI = 'claiming task'
        updateUI()
        const ticket = await Q.claimTask(ref, task, 'pi client')
        console.time('computing...')
        stateForUI = 'computing'
        updateUI()
        const result = await sampleNTimesAsync(ticket.n)
        console.timeEnd('computing...')
        await Q.completeTask(ref, ticket, result)
        stateForUI = 'idle'
        updateUI()
    } catch (err) {
        console.log('did not claim task:', err)
    }
})

window.addTask = async function addTask() {
    await Q.addTask(ref, {
        n: 20000000,
        signed: 'pi demo',
    })
}

// Keep a running total
const results = []
ref.child('complete').on('child_added', async (snap) => {
    // there should be a helper for this
    const snap2 = await ref.child('tasks').child(snap.key).once('value')
    const val = snap2.val()
    if (val.result) {
        sum = sum + val.result.sum
        count = count + val.result.n
        let piEstimate = 4 * (sum / count)
        results.push({ ...val.result, piEstimate, totalCount: count })
    }
    console.log('pi ~=', 4 * (sum / count))
    updateUI()
    updateGraph(results)
})

/**
 *
 *  UI
 *
 * */

function updateUI() {
    document.getElementById('status').innerText = `status: ${stateForUI}`
    document.getElementById(
        'results'
    ).innerHTML = `<div>total samples:${count}</div>
<div>total samples in circle:${sum}</div>
<div>pi estimation:${4 * (sum / count)}</div>
<div>pi estimation error:${Math.abs(Math.PI - 4 * (sum / count))}</div>`
}

/**
 *
 * GRAPHING
 *
 *
 */

// set the dimensions and margins of the graph
var margin = { top: 10, right: 30, bottom: 30, left: 50 },
    width = 460 - margin.left - margin.right,
    height = 400 - margin.top - margin.bottom

// append the svg object to the body of the page
var svg = d3
    .select('#my_dataviz')
    .append('svg')
    .attr('width', width + margin.left + margin.right)
    .attr('height', height + margin.top + margin.bottom)
    .append('g')
    .attr('transform', 'translate(' + margin.left + ',' + margin.top + ')')

// Initialise a X axis:
var x = d3.scaleLinear().range([0, width])
var xAxis = d3.axisBottom().scale(x).ticks(6).tickFormat(d3.format('.2n'))
svg.append('g')
    .attr('transform', 'translate(0,' + height + ')')
    .attr('class', 'myXaxis')

// Initialize an Y axis
var y = d3.scaleLinear().range([height, 0])
var yAxis = d3.axisLeft().scale(y)
svg.append('g').attr('class', 'myYaxis')

// Create a function that takes a dataset as input and update the plot:
function updateGraph(data) {
    // Create the X axis:
    x.domain([
        0,
        d3.max(data, function (d) {
            return d.totalCount
        }),
    ])
    svg.selectAll('.myXaxis').call(xAxis)

    // create the Y axis
    y.domain([
        d3.min(data, function (d) {
            return d.piEstimate
        }),
        d3.max(data, function (d) {
            return d.piEstimate
        }),
    ])
    svg.selectAll('.myYaxis').call(yAxis)

    // Create a update selection: bind to the new data
    var u = svg.selectAll('.lineTest').data([data], function (d) {
        return d.totalCount
    })

    // Updata the line
    u.enter()
        .append('path')
        .attr('class', 'lineTest')
        .merge(u)
        .attr(
            'd',
            d3
                .line()
                .defined((d) => !isNaN(d.piEstimate))
                .x(function (d) {
                    return x(d.totalCount)
                })
                .y(function (d) {
                    return y(d.piEstimate)
                })
        )
        .attr('fill', 'none')
        .attr('stroke', 'steelblue')
        .attr('stroke-width', 2.5)
}
