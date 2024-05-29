import { Module } from '@nestjs/common';
import { ScheduleModule } from 'nest-schedule';
import { TypeOrmModule } from '@nestjs/typeorm';

import KsmService from './ksm.service';
import DotService from './dot.service';
import MovrService from './movr.service';
import { configService } from './config.service';
import GlmrService from './glmr.service';
import MantaService from './manta.service';

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
      name: 'moonriver',
      ...configService.getMoonriverDbConfig(),
    }),
    TypeOrmModule.forRoot({
      name: 'moonbeam',
      ...configService.getMoonbeamDbConfig(),
    }),
    TypeOrmModule.forRoot({
      name: 'manta',
      ...configService.getMantaDbConfig(),
    }),
    TypeOrmModule.forRoot({
      name: 'kusama_mark',
      ...configService.getKusamaMarkDbConfig(),
    }),
    ScheduleModule.register(),
  ],
  controllers: [],
  providers: [KsmService, DotService, MovrService, GlmrService, MantaService],
})
export class AppModule {}
