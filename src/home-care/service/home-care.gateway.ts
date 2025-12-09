import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { HomeCareService } from './home-care.service';

@WebSocketGateway({ cors: { origin: '*' } })
export class HomeCareGateway {
  @WebSocketServer() server: Server;

  constructor(private readonly homeCareService: HomeCareService) {}

  // provider client joins a room for their providerId
  @SubscribeMessage('provider:join')
  async onJoin(
    @MessageBody() data: { providerId: string },
    @ConnectedSocket() client: Socket,
  ) {
    client.join(`provider_${data.providerId}`);
    return { ok: true };
  }

  // provider sends live location updates
  @SubscribeMessage('provider:location')
  async onLocation(
    @MessageBody() data: { providerId: string; lat: number; lng: number },
  ) {
    // persist location
    await this.homeCareService.updateProviderLocation(
      data.providerId,
      data.lng,
      data.lat,
    );

    // broadcast to any client listening for that appointment / provider
    this.server
      .to(`provider_${data.providerId}`)
      .emit('provider:location:update', {
        providerId: data.providerId,
        lat: data.lat,
        lng: data.lng,
      });

    return { ok: true };
  }
}
