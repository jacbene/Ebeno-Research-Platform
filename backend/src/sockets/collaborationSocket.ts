import { Server, Socket } from 'socket.io';

export class CollaborationSocketHandler {
  private io: Server;

  constructor(io: Server) {
    this.io = io;
    this.setupSocketEvents();
  }

  private setupSocketEvents(): void {
    this.io.on('connection', (socket: Socket) => {
      console.log('🔌 New client connected:', socket.id);

      // Rejoindre une room de projet
      socket.on('join-project', (projectId: string) => {
        socket.join(projectId);
        console.log(`Socket ${socket.id} joined project ${projectId}`);
      });

      // Quitter une room de projet
      socket.on('leave-project', (projectId: string) => {
        socket.leave(projectId);
        console.log(`Socket ${socket.id} left project ${projectId}`);
      });

      // Transcription en temps réel
      socket.on('transcription-update', (data: {
        projectId: string;
        transcriptionId: string;
        content: string;
        userId: string;
      }) => {
        socket.to(data.projectId).emit('transcription-updated', {
          transcriptionId: data.transcriptionId,
          content: data.content,
          userId: data.userId,
          timestamp: new Date().toISOString(),
        });
      });

      // Chat de collaboration
      socket.on('send-message', (data: {
        projectId: string;
        message: string;
        userId: string;
        userName: string;
      }) => {
        socket.to(data.projectId).emit('new-message', {
          message: data.message,
          userId: data.userId,
          userName: data.userName,
          timestamp: new Date().toISOString(),
        });
      });

      // Position du curseur en temps réel
      socket.on('cursor-position', (data: {
        projectId: string;
        transcriptionId: string;
        userId: string;
        userName: string;
        position: number;
      }) => {
        socket.to(data.projectId).emit('cursor-moved', {
          transcriptionId: data.transcriptionId,
          userId: data.userId,
          userName: data.userName,
          position: data.position,
          timestamp: new Date().toISOString(),
        });
      });

      socket.on('disconnect', () => {
        console.log('🔌 Client disconnected:', socket.id);
      });
    });
  }
}
