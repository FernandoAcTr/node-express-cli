import SocketIO from 'socket.io'
import { Server } from 'http'
import * as SocketController  from './socket.controller'

class Socket {
  private io: SocketIO.Server
  //
  constructor(server: Server) {
    this.io = new SocketIO.Server(server)
    this.io.on('connection', (socket) =>
      SocketController.connect(socket, this.io)
    )
  }
}

export default Socket
