import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayInit,
  OnGatewayConnection,
  OnGatewayDisconnect,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Injectable, Logger } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { EventPublisher, EventSubscriber, SCAN_EVENTS_CHANNEL } from '@qa-automater/shared';
import type {
  ScanProgressPayload,
  ScanCompletePayload,
  WebSocketMessage,
} from '@qa-automater/types';

@WebSocketGateway({
  namespace: '/v1/ws',
  cors: {
    origin: '*',
  },
})
@Injectable()
export class EventsGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server!: Server;

  private readonly logger = new Logger(EventsGateway.name);
  private publisher = new EventPublisher();
  private subscriber = new EventSubscriber();

  async afterInit() {
    this.logger.log('EventsGateway initialized on namespace /v1/ws');

    // Subscribe to Redis PubSub events so workers across ECS tasks broadcast to API WebSocket clients
    await this.subscriber.subscribe(SCAN_EVENTS_CHANNEL, (msg: WebSocketMessage) => {
      this.handleRedisEvent(msg);
    });
  }

  handleConnection(client: Socket) {
    const token = client.handshake.query.token as string | undefined;
    this.logger.log(`Client connected: ${client.id} (token present: ${Boolean(token)})`);
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  @SubscribeMessage('subscribe:scan')
  @SubscribeMessage('subscribe.scan')
  handleSubscribeScan(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { scan_id: string } | string,
  ) {
    const scanId = typeof data === 'string' ? data : data?.scan_id;
    if (scanId) {
      const room = `scan:${scanId}`;
      client.join(room);
      this.logger.log(`Client ${client.id} joined room ${room}`);
      return { status: 'subscribed', scan_id: scanId };
    }
    return { status: 'error', message: 'scan_id is required' };
  }

  @SubscribeMessage('unsubscribe:scan')
  @SubscribeMessage('unsubscribe.scan')
  handleUnsubscribeScan(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { scan_id: string } | string,
  ) {
    const scanId = typeof data === 'string' ? data : data?.scan_id;
    if (scanId) {
      const room = `scan:${scanId}`;
      client.leave(room);
      this.logger.log(`Client ${client.id} left room ${room}`);
      return { status: 'unsubscribed', scan_id: scanId };
    }
    return { status: 'error', message: 'scan_id is required' };
  }

  /**
   * Publish a scan.progress event to Redis PubSub and broadcast locally.
   */
  async emitScanProgress(payload: ScanProgressPayload): Promise<void> {
    await this.publisher.publish('scan.progress', payload);
  }

  /**
   * Publish a scan.complete event to Redis PubSub and broadcast locally.
   */
  async emitScanComplete(payload: ScanCompletePayload): Promise<void> {
    await this.publisher.publish('scan.complete', payload);
  }

  /**
   * Forward Redis PubSub events to Socket.IO clients in targeted scan rooms and global listeners.
   */
  private handleRedisEvent(msg: WebSocketMessage) {
    if (!this.server || !msg || typeof msg !== 'object') return;

    if (msg.event === 'scan.progress') {
      const data = msg.data as ScanProgressPayload;
      if (data?.scan_id) {
        this.server.to(`scan:${data.scan_id}`).emit('scan.progress', data);
      }
      this.server.emit('scan.progress', data);
    } else if (msg.event === 'scan.complete') {
      const data = msg.data as ScanCompletePayload;
      if (data?.scan_id) {
        this.server.to(`scan:${data.scan_id}`).emit('scan.complete', data);
      }
      this.server.emit('scan.complete', data);
    } else {
      this.server.emit(msg.event, msg.data);
    }
  }

  async onModuleDestroy() {
    await this.subscriber.close();
    await this.publisher.close();
  }
}
