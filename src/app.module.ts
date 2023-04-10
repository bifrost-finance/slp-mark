import { Module } from '@nestjs/common';
import { ScheduleModule } from 'nest-schedule';
import { TypeOrmModule } from '@nestjs/typeorm';

import KsmService from './ksm.service';
import DotService from './dot.service';
import { configService } from './config.service';

@Module({
  imports: [
    TypeOrmModule.forRoot({
      name: 'kusama',
      ...configService.getKusamaDbConfig(),
    }),
    TypeOrmModule.forRoot({
      name: 'polkadot',
      ...configService.getPolkadotDbConfig(),
    }),
    TypeOrmModule.forRoot({
      name: 'kusama_mark',
      ...configService.getKusamaMarkDbConfig(),
    }),
    ScheduleModule.register(),
  ],
  controllers: [],
  providers: [KsmService, DotService],
})
export class AppModule {}
