import superagent from 'superagent'
import Promise from 'bluebird'

const methods = ['get', 'post', 'put', 'patch', 'del']

let requestHandler = {}

const createError = (err, body) => {
  if (body && body.error) {
    let e = new Error(body.error.message)
    e.stack = body.error.stack
    return e
  }

  return err || new Error('API call failed')
}

methods.forEach((m) => {
  requestHandler[m] = (path, { params, data } = {}) => new Promise((resolve, reject) => {
    const request = superagent[m](path)

    request.set('X-Requested-With', 'XMLHttpRequest')
    request.set('Expires', '-1')
    request.set('Cache-Control', 'no-cache,no-store,must-revalidate,max-age=-1,private')

    if (params) {
      request.query(params)
    }

    if (data) {
      request.send(data)
    }

    request.end((err, { body } = {}) => err ? reject(createError(err, body)) : resolve(body))
  })
})

export default requestHandler

let stubHandler = {}
methods.forEach((m) => {
  stubHandler[m] = (stub) => (requestHandler [m] = stub)
})

export let stub = stubHandler
