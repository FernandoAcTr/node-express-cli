declare namespace Express {
  interface User {
    id: number | string
  }
  interface Request {
    user?: User
  }
}
