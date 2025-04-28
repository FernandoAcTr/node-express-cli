import * as httpContext from 'express-http-context'

class Context {
  set userId(id: number) {
    httpContext.set('userId', id)
  }
  get userId(): number | undefined {
    return httpContext.get('userId')
  }
}

export const context = new Context()
