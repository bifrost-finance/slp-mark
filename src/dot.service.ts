import { Injectable } from '@nestjs/common';
import { Timeout, NestSchedule } from 'nest-schedule';

@Injectable()
export class DotService extends NestSchedule {
  @Timeout(0)
  polkadotScan() {
    console.log('dot interval job');
  }
}
