import SocketIO from 'socket.io'
import { Server } from 'http'
import * as SocketController from './socket.controller'

export class Socket {
  private static io: SocketIO.Server

  constructor(server: Server) {
    Socket.io = new SocketIO.Server(server)
    Socket.io.on('connection', (socket) => {
      // Scaffold: el cliente declara su userId en el handshake. En producción
      // valida un JWT aquí antes de unir el socket al room del usuario.
      const userId = socket.handshake.auth?.userId ?? socket.handshake.query?.userId

      if (userId !== undefined && userId !== null && userId !== '') {
        socket.join(`user-${userId}`)
      }

      SocketController.connect(socket, Socket.io)
    })
  }

  static emitToUser(userId: number | string, event: string, payload: unknown): void {
    Socket.io?.to(`user-${userId}`).emit(event, payload)
  }
}

export default Socket
