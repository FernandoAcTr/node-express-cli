import { InstallerSpec } from '../spec'

export const socketSpec: InstallerSpec = {
  feature: 'socket',
  description: 'Add Socket.io to the project',
  deps: ['socket.io'],
  files: [
    { from: 'generator/common/socketio/socket.ts', to: 'src/socket.ts', stage: 'post' },
    {
      from: 'generator/common/socketio/socket.controller.ts',
      to: 'src/socket.controller.ts',
      stage: 'post',
    },
  ],
  wire: [
    { kind: 'import', statement: "import SocketIO from './socket'" },
    { kind: 'main', anchor: 'afterListen', code: 'const socket = new SocketIO(server)', key: 'new SocketIO(server)' },
  ],
  skippedSuffix: 'already has the socket configuration',
}
