import { Injectable } from '@nestjs/common';
import { Timeout, Cron } from 'nest-schedule';
import { ApiPromise, WsProvider } from '@polkadot/api';
import { InjectEntityManager } from '@nestjs/typeorm';
import { EntityManager } from 'typeorm';
import { hexToString, isHex } from '@polkadot/util';
import { NestSchedule } from 'nest-schedule/index';
import BigNumber from 'bignumber.js';
import { orderBy } from 'lodash';

import {
  StakingErapaids,
  MoonbeamEra,
  MoonbeamValidatorEra,
} from './entities/oracle.entity';

@Injectable()
export default class GlmrService extends NestSchedule {
  constructor(
    @InjectEntityManager('moonbeam')
    private moonbeamSlpDB: EntityManager,
    @InjectEntityManager('kusama_mark')
    private markDB: EntityManager,
  ) {
    super();
  }

  //每3小时调用一次
  @Cron('0 */3 * * *')
  //@Timeout(0)
  async moonbeamScan() {
    console.log('moonbeam staking scan start!');

    const wsProvider = new WsProvider(
      'wss://moonbeam.api.onfinality.io/public-ws',
    );
    const api = await ApiPromise.create({ provider: wsProvider });

    const stakingEras = await this.moonbeamSlpDB
      .getRepository(StakingErapaids)
      .createQueryBuilder()
      .orderBy('block_timestamp', 'DESC')
      .limit(100)
      .getMany();

    await this.markDB
      .getRepository(MoonbeamEra)
      .createQueryBuilder()
      .where('CAST(era AS INT) < :era', {
        era: Number(stakingEras[0].era_index) - 100,
      })
      .delete()
      .execute();
    await this.markDB
      .getRepository(MoonbeamValidatorEra)
      .createQueryBuilder()
      .where('CAST(era AS INT) < :era', {
        era: Number(stakingEras[0].era_index) - 100,
      })
      .delete()
      .execute();

    const moonbeamEra = await this.markDB
      .getRepository(MoonbeamEra)
      .createQueryBuilder()
      .orderBy('era', 'DESC')
      .getMany();
    const eras = stakingEras.filter(
      (item) => !moonbeamEra.map((item) => item.era).includes(item.era_index),
    );

    console.log('eras:', eras.length);
    const candidateInfo =
      await api.query.parachainStaking.candidateInfo.entries();

    for (let i = 0; i < eras.length; i++) {
      const era = eras[eras.length - i - 1].era_index;
      console.log('era:', era);

      const allValidators = candidateInfo.map((item) => item[0].toHuman()[0]);
      const activeValidators = (
        await api.query.parachainStaking.selectedCandidates()
      ).toJSON() as any;
      const waitValidators = allValidators.filter(
        (item) => !activeValidators.includes(item),
      );

      const validatorsActiveEraData = await Promise.all(
        activeValidators.map(async (validator) => {
          const identity = await getIdentity(validator, api);

          const reward_points = (
            await api.query.parachainStaking.awardedPts(
              Number(era) - 1,
              validator,
            )
          ).toHuman();
          const { totalCounted } = candidateInfo
            .find((item) => item[0].toHuman()[0] === validator)[1]
            .toJSON() as any;
          const validatorHistory = await this.markDB
            .getRepository(MoonbeamValidatorEra)
            .createQueryBuilder()
            .where('CAST(era AS INT) > :era AND validator =:validator', {
              era: Number(era) - 84,
              validator,
            })
            .orderBy('era', 'DESC')
            .getMany();

          const { all_reward_points, all_reward_points_time, active_time } =
            validatorHistory.reduce(
              (acc, item) => {
                if (item.reward_points !== '0') {
                  acc.all_reward_points =
                    acc.all_reward_points + Number(item.reward_points);
                  acc.all_reward_points_time = acc.all_reward_points_time + 1;
                }
                if (!!item.is_active) {
                  acc.active_time = acc.active_time + 1;
                }
                return acc;
              },
              {
                all_reward_points: 0,
                all_reward_points_time: 0,
                active_time: 0,
              },
            );
          const average_reward_points = new BigNumber(all_reward_points)
            .div(all_reward_points_time || 1)
            .toFixed();

          const rank = new BigNumber(average_reward_points)
            .multipliedBy(renderPoint(identity?.judgements?.[0]?.[1]))
            .multipliedBy(0.9 + active_time * 0.1)
            .div(totalCounted)
            .multipliedBy(1000000000)
            .toString();

          return {
            id: validator + '-' + era,
            validator,
            is_active: true,
            reward_points,
            average_reward_points,
            total_bond: new BigNumber(totalCounted).toString(),
            identity_level: identity?.judgements?.[0]?.[1],
            rank,
          };
        }),
      );

      const currentMoonbeamEra = {
        era,
        average_reward_points: new BigNumber(
          validatorsActiveEraData.reduce(
            (acc, { reward_points }) =>
              new BigNumber(reward_points).plus(acc).toNumber(),
            0,
          ) / validatorsActiveEraData.length,
        ).toString(),
        average_bond: new BigNumber(
          validatorsActiveEraData.reduce(
            (acc, { total_bond }) =>
              new BigNumber(total_bond).plus(acc).toNumber(),
            0,
          ) / validatorsActiveEraData.length,
        ).toString(),
        min_bond: orderBy(validatorsActiveEraData, ({ total_bond }) =>
          new BigNumber(total_bond).toNumber(),
        )[0].total_bond,
      };
      const validatorsWaitEraData = await Promise.all(
        waitValidators.map(async (validator) => {
          const identity = await getIdentity(validator, api);

          const validatorHistory = await this.markDB
            .getRepository(MoonbeamValidatorEra)
            .createQueryBuilder()
            .where('CAST(era AS INT) > :era AND validator =:validator', {
              era: Number(era) - 84,
              validator,
            })
            .orderBy('era', 'DESC')
            .getMany();
          const { all_reward_points, all_reward_points_time, active_time } =
            validatorHistory.reduce(
              (acc, item) => {
                if (item.reward_points !== '0') {
                  acc.all_reward_points =
                    acc.all_reward_points + Number(item.reward_points);
                  acc.all_reward_points_time = acc.all_reward_points_time + 1;
                }
                if (!!item.is_active) {
                  acc.active_time = acc.active_time + 1;
                }
                return acc;
              },
              {
                all_reward_points: 0,
                all_reward_points_time: 0,
                active_time: 0,
              },
            );
          const average_reward_points = new BigNumber(all_reward_points)
            .div(all_reward_points_time || 1)
            .toFixed();

          const rank = new BigNumber(average_reward_points)
            .multipliedBy(renderPoint(identity?.judgements?.[0]?.[1]))
            .multipliedBy(0.9)
            .div(currentMoonbeamEra.min_bond)
            .multipliedBy(1000000000)
            .toString();

          return {
            id: validator + '-' + era,
            validator,
            is_active: false,
            identity_level: identity?.judgements?.[0]?.[1],
            average_reward_points,
            rank,
          };
        }),
      );

      await this.markDB
        .getRepository(MoonbeamValidatorEra)
        .save([...validatorsActiveEraData, ...validatorsWaitEraData]);
      await this.markDB.getRepository(MoonbeamEra).save(currentMoonbeamEra);

      console.log(`moonbeam ${era} scan finished!`);
    }

    console.log('moonbeam staking scan finished!');
  }
}

const getIdentity = async (address, api) => {
  const account = await api?.query?.identity?.identityOf(address);

  if (account.toHuman()) {
    return account.toHuman();
  } else {
    const superOfAccount = await api?.query?.identity?.superOf(address);
    if (superOfAccount?.toJSON()?.[0]) {
      const result = await api?.query?.identity?.identityOf(
        superOfAccount?.toJSON()?.[0],
      );
      return {
        ...result.toHuman(),
        raw: isHex(superOfAccount?.toHuman()?.[1].Raw)
          ? hexToString(superOfAccount?.toHuman()?.[1].Raw)
          : superOfAccount?.toHuman()?.[1].Raw,
      };
    } else {
      return {};
    }
  }
};

const renderPoint = (name) => {
  switch (name) {
    case 'KnownGood':
      return 1.04;
    case 'FeePaid':
    case 'Reasonable':
      return 1.02;
    case 'Unknown':
    case 'OutOfDate':
      return 1.01;
    case 'LowQuality':
      return 0.98;
    case 'Erroneous':
      return 0.95;

    default:
      return 1.01;
  }
};
