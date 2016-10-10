export const SECONDS = 1000

export const OK = 'success'
export const LOADING = 'loading'
export const ERRORED = 'errored'

export const fallbackTimeToNow = now => now ? now() : new Date().getTime()

export const JSON_HEADER = { 'content-type': 'application/json' }

export const contexts = {};
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

export function update() {
  const args = [].slice.call(arguments);
  args.forEach((element, index) => {
    if (!element) {
      args[index] = {}
    }
  })
  args.unshift({})
  return Object.assign.apply(null, args)
}

export function mutateToLoading(namespace, viewModel) {
  return update(viewModel, {
    loading: update(
      viewModel.loading,
      { [namespace]: contexts.loading() }
    )
  })
}

export function mutateToFailure(namespace, doUpdate) {
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

export function mutateToSuccess(namespace, doUpdate) {
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

export function simpleFetch(url) {
  return fetch(url).then(res => res.json())
}

export const turnResponseIntoJson = response => response.json()

export function configureSimpleFetch(namespace, doUpdate) {

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
