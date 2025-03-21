declare namespace Express {
  interface Request {
    user: User
  }
  interface User {
    id: number
  }
}
