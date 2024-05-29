import { TypeOrmModuleOptions } from '@nestjs/typeorm';

import {
  StakingErapaids,
  KusamaEra,
  KusamaValidatorEra,
  PolkadotEra,
  PolkadotValidatorEra,
  MoonriverEra,
  MoonriverValidatorEra,
  MoonbeamEra,
  MoonbeamValidatorEra,
  MantaEra,
  MantaValidatorEra,
} from './entities/oracle.entity';

// eslint-disable-next-line @typescript-eslint/no-var-requires
require('dotenv').config();

export class ConfigService {
  constructor(private env: { [k: string]: string | undefined }) {}

  public ensureValues(keys: string[]) {
    keys.forEach((k) => this.getValue(k));
    return this;
  }

  public getKusamaDbConfig(): TypeOrmModuleOptions {
    return {
      type: 'postgres',
      host: this.getValue('DB_HOST'),
      port: parseInt(this.getValue('DB_PORT')),
      username: this.getValue('DB_USER'),
      password: this.getValue('DB_PASS'),
      database: this.getValue('KUSAMA_DB_DATABAS'),
      entities: [StakingErapaids],
    };
  }

  public getPolkadotDbConfig(): TypeOrmModuleOptions {
    return {
      type: 'postgres',
      host: this.getValue('DB_HOST'),
      port: parseInt(this.getValue('DB_PORT')),
      username: this.getValue('DB_USER'),
      password: this.getValue('DB_PASS'),
      database: 'slp_polkadot_polkadot',
      entities: [StakingErapaids],
    };
  }

  public getMoonriverDbConfig(): TypeOrmModuleOptions {
    return {
      type: 'postgres',
      host: this.getValue('DB_HOST'),
      port: parseInt(this.getValue('DB_PORT')),
      username: this.getValue('DB_USER'),
      password: this.getValue('DB_PASS'),
      database: 'slp_vmovr_moonriver',
      entities: [StakingErapaids],
    };
  }

  public getMoonbeamDbConfig(): TypeOrmModuleOptions {
    return {
      type: 'postgres',
      host: this.getValue('DB_HOST'),
      port: parseInt(this.getValue('DB_PORT')),
      username: this.getValue('DB_USER'),
      password: this.getValue('DB_PASS'),
      database: 'slp_vglmr_slp',
      entities: [StakingErapaids],
    };
  }
  public getMantaDbConfig(): TypeOrmModuleOptions {
    return {
      type: 'postgres',
      host: this.getValue('DB_HOST'),
      port: parseInt(this.getValue('DB_PORT')),
      username: this.getValue('DB_USER'),
      password: this.getValue('DB_PASS'),
      database: 'slp_manta_subql',
      schema: 'app',
      entities: [StakingErapaids],
    };
  }

  public getKusamaMarkDbConfig(): TypeOrmModuleOptions {
    return {
      type: 'postgres',
      host: this.getValue('KUSAMA_HOST'),
      port: parseInt(this.getValue('KUSAMA_PORT')),
      username: this.getValue('KUSAMA_USER'),
      password: this.getValue('KUSAMA_PASS'),
      database: this.getValue('KUSAMA_DATABAS'),
      entities: [
        KusamaEra,
        KusamaValidatorEra,
        PolkadotEra,
        PolkadotValidatorEra,
        MoonriverEra,
        MoonriverValidatorEra,
        MoonbeamEra,
        MoonbeamValidatorEra,
        MantaEra,
        MantaValidatorEra,
      ],
    };
  }

  private getValue(key: string): string {
    const value = this.env[key];

    return value;
  }
}

const configService = new ConfigService(process.env).ensureValues([
  'DB_HOST',
  'DB_PORT',
  'DB_USER',
  'DB_PASS',
  'KUSAMA_DB_DATABAS',
  'KUSAMA_HOST',
  'KUSAMA_PORT',
  'KUSAMA_USER',
  'KUSAMA_PASS',
  'KUSAMA_DATABAS',
]);

export { configService };
