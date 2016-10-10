import React from 'react'
import ReactDOM from 'react-dom'

import { EventEmitter } from 'events'

import { update } from './constants'

export default function createFlow(sources) {

  var state, updating = false, updateQueue = []

  const events = new EventEmitter()
  const eventName = 'new state'

  const setInitialState = () => ({})
  onNewMessage(setInitialState)

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

  return {
    getState,
    doUpdate,
    subscribe,
    unsubscribe
  }
}

export function render(flow, theView, anchor) {
  flow.subscribe((state) => {
    ReactDOM.render( <theView {...state} />, document.getElementById(anchor))
  })
}

export {
  SECONDS, JSON_HEADER, fallbackTimeToNow, update,
  OK, LOADING, ERRORED, 
  contexts, mutateToLoading, mutateToSuccess, mutateToFailure, 
  simpleFetch, configureSimpleFetch
} from './constants.js'
