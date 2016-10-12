const EventEmitter = require('events')

const SECONDS = 1000

const OK = 'success'
const LOADING = 'loading'
const ERRORED = 'errored'

const fallbackTimeToNow = now => now ? now() : new Date().getTime()

const JSON_HEADER = { 'content-type': 'application/json' }

const contexts = {};
['success', 'loading', 'errored'].forEach(name => {
  contexts[name] = (result, now) => {
    const time = fallbackTimeToNow(now)
    return {
      type: name,
      time,
      kash: result
    }
  }
})

function update() {
  const args = [].slice.call(arguments);
  args.forEach((element, index) => {
    if (!element) {
      args[index] = {}
    }
  })
  args.unshift({})
  return Object.assign.apply(null, args)
}

function mutateToLoading(namespace, viewModel) {
  return update(viewModel, {
    loading: update(
      viewModel.loading,
      { [namespace]: contexts.loading() }
    )
  })
}

function mutateToFailure(namespace, doUpdate) {
  return error => {
    doUpdate(viewModel => {
      return update(viewModel, {
        loading: update(
          viewModel.loading,
          { [namespace]: contexts.errored(error) }
        )
      })
    })
  }
}

function mutateToSuccess(namespace, doUpdate) {
  return result => {
    doUpdate(viewModel => {
      return update(viewModel, {
        loading: update(
          viewModel.loading,
          { [namespace]: contexts.success(result) }
        ),
        [ namespace ]: result
      })
    })
  }
}

function simpleFetch(url) {
  return fetch(url).then(res => res.json())
}

const turnResponseIntoJson = response => response.json()

function configureSimpleFetch(namespace, doUpdate) {

  const storeResultOnViewModel = mutateToSuccess(namespace, doUpdate)
  const respondToFailure = mutateToFailure(namespace, doUpdate)
  const switchToLoad = mutateToLoading(namespace, doUpdate)

  return (url, options) => {
    fetch(url, options)
      .then(turnResponseIntoJson)
      .then(storeResultOnViewModel)
      .catch(respondToFailure)
    return switchToLoad(null)
  }
}

function createFlow(sources) {

  var state, updating = false, updateQueue = []

  const events = new EventEmitter()
  const eventName = 'new state'

  const setInitialState = () => ({})

  function onNewMessage(message) {
    updateQueue.push(message)
    if (updating) {
      return
    }

    updating = true

    while (updateQueue.length) {
      message = updateQueue.shift()

      tryEvaluation(message)
      for (var source of sources) {
        tryEvaluation(source)
      }
    }

    updating = false
  }

  function tryEvaluation(source) {
    try {
      const result = source(state, doUpdate)
      evaluateAndReplaceState(result)
    } catch (e) {
      console.error('Uncaught error while evaluating source', e)
    }
  }

  function evaluateAndReplaceState(newState) {
    if (newState && !Object.is(state, newState)) {
      state = update({}, newState)
      console.log('replacing state with', newState)
      events.emit(eventName, state)
    }
  }

  function doUpdate(updateFunction){
    onNewMessage(updateFunction)
  }

  function getState() {
    return state
  }

  function subscribe(listener) {
    events.on(eventName, listener)
  }

  function unsubscribe(listener) {
    events.off(listener)
  }

  function start() {
    onNewMessage(setInitialState)
  }

  return {
    getState,
    doUpdate,
    subscribe,
    unsubscribe,
    start
  }
}

module.exports = {
  createFlow,
  update,

  SECONDS,
  fallbackTimeToNow,

  JSON_HEADER,
  turnResponseIntoJson,

  OK, LOADING, ERRORED, 
  contexts, mutateToLoading, mutateToSuccess, mutateToFailure, 

  simpleFetch, configureSimpleFetch
}
