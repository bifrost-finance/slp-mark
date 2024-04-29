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
  PolkadotEra,
  PolkadotValidatorEra,
} from './entities/oracle.entity';

@Injectable()
export default class DotService extends NestSchedule {
  constructor(
    @InjectEntityManager('polkadot')
    private polkadotSlpDB: EntityManager,
    @InjectEntityManager('kusama_mark')
    private kusamaMarkDB: EntityManager,
  ) {
    super();
  }

  //每2小时调用一次
  @Cron('0 */2 * * *')
  //@Timeout(0)
  async polkadotScan() {
    console.log('polkadot staking scan start!');

    const wsProvider = new WsProvider('wss://rpc.polkadot.io');
    const api = await ApiPromise.create({ provider: wsProvider });

    const stakingEras = await this.polkadotSlpDB
      .getRepository(StakingErapaids)
      .createQueryBuilder()
      .orderBy('block_timestamp', 'DESC')
      .limit(14)
      .getMany();

    await this.kusamaMarkDB
      .getRepository(PolkadotEra)
      .createQueryBuilder()
      .where('CAST(era AS INT) < :era', {
        era: Number(stakingEras[0].era_index) - 14,
      })
      .delete()
      .execute();
    await this.kusamaMarkDB
      .getRepository(PolkadotValidatorEra)
      .createQueryBuilder()
      .where('CAST(era AS INT) < :era', {
        era: Number(stakingEras[0].era_index) - 14,
      })
      .delete()
      .execute();

    const kusamaEra = await this.kusamaMarkDB
      .getRepository(PolkadotEra)
      .createQueryBuilder()
      .orderBy('era', 'DESC')
      .getMany();
    const eras = stakingEras.filter(
      (item) => !kusamaEra.map((item) => item.era).includes(item.era_index),
    );
    const nominators = await api.query.staking.nominators.entries();

    // const approvalStake = {};
    // if (eras.length > 0) {
    //   await Promise.all(
    //     nominators.map(async (nominator) => {
    //       const address = nominator[0].toHuman()[0];
    //       const { amount } = (
    //         await api.query.balances.locks(address)
    //       ).toJSON()[0] as any;
    //       const { targets } = nominator[1].toJSON() as any;
    //       targets.map((item) => {
    //         if (approvalStake[item]) {
    //           approvalStake[item] = new BigNumber(amount)
    //             .plus(approvalStake[item])
    //             .toString();
    //         } else {
    //           approvalStake[item] = amount;
    //         }
    //       });
    //     }),
    //   );
    // }

    console.log('eras:', eras.length);

    for (let i = 0; i < eras.length; i++) {
      const era = eras[eras.length - i - 1].era_index;
      console.log('era:', era);

      const validators = await api.query.staking.validators.entries();
      const { individual: rewardValidators } = (
        await api.query.staking.erasRewardPoints(era)
      ).toJSON() as any;

      const validatorsActiveEraData = await Promise.all(
        validators.map(async (validator) => {
          const address = validator[0].toHuman()[0];
          const is_active = !!rewardValidators[address];

          if (is_active) {
            const { commission } = validator[1].toHuman() as any;
            const reward_points = rewardValidators[address] || '0';
            const identity = await getIdentity(address, api);
            const erasStakers = (
              await api.query.staking.erasStakers(era, address)
            ).toJSON() as any;
            const erasStakersPaged =
              (await api.query.staking.erasStakersPaged.entries(
                era,
                address,
              )) as any;
            const total =
              erasStakersPaged?.[0]?.[1]?.toJSON()?.pageTotal ||
              erasStakers?.total ||
              '0';
            const validatorHistory = await this.kusamaMarkDB
              .getRepository(PolkadotValidatorEra)
              .createQueryBuilder()
              .where('CAST(era AS INT) > :era AND validator =:validator', {
                era: Number(era) - 7,
                validator: address,
              })
              .orderBy('era', 'DESC')
              .getMany();
            const { all_reward_points, active_time, all_reward_points_time } =
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
                  active_time: 0,
                  all_reward_points_time: 0,
                },
              );

            const slashingSpans = (
              await api.query.staking.slashingSpans(address)
            ).toJSON() as any;
            const average_reward_points = new BigNumber(all_reward_points)
              .div(all_reward_points_time || 1)
              .toFixed();
            const active_rate = new BigNumber(active_time).div(14).toFixed();
            const rank = total
              ? new BigNumber(average_reward_points)
                  .multipliedBy(renderPoint(identity?.judgements?.[0]?.[1]))
                  .multipliedBy(100 - commission.split('.')[0])
                  .multipliedBy(
                    0.9 +
                      Math.pow(
                        new BigNumber(active_time).div(7).toNumber(),
                        1 / 3,
                      ) /
                        10,
                  )
                  .div(total)
                  .multipliedBy(1000000000)
                  .toString()
              : '0';

            return {
              id: address + '-' + era,
              validator: address,
              era,
              nominator: '0',
              total_bond: new BigNumber(total).toString(),
              is_active,
              reward_points,
              identity_level: identity?.judgements?.[0]?.[1],
              commission,
              last_nonzero_slash: slashingSpans?.lastNonzeroSlash,
              average_reward_points,
              active_rate,
              rank,
            };
          } else return null;
        }),
      );

      const activeValidatorData = validatorsActiveEraData.filter(
        (item) => item?.is_active,
      );

      const average_reward_points = new BigNumber(
        activeValidatorData.reduce(
          (acc, { reward_points }) =>
            new BigNumber(reward_points).plus(acc).toNumber(),
          0,
        ) / activeValidatorData.length,
      ).toString();
      const average_bond = new BigNumber(
        activeValidatorData.reduce(
          (acc, { total_bond }) =>
            new BigNumber(total_bond).plus(acc).toNumber(),
          0,
        ) / activeValidatorData.length,
      ).toString();

      const kusamaEra = {
        era,
        average_reward_points,
        average_bond,
        min_bond: orderBy(activeValidatorData, ({ total_bond }) =>
          new BigNumber(total_bond).toNumber(),
        ).filter((v) => v.total_bond !== '0')?.[0].total_bond,
        min_approval_stake: orderBy(activeValidatorData, ({ nominator }) =>
          new BigNumber(nominator).toNumber(),
        )[0].nominator,
      };

      const validatorsWaitEraData = await Promise.all(
        validators.map(async (validator) => {
          const address = validator[0].toHuman()[0];
          const is_active = !!rewardValidators[address];

          if (!is_active) {
            const { commission } = validator[1].toHuman() as any;
            const reward_points = rewardValidators[address] || '0';
            const identity = await getIdentity(address, api);
            const erasStakers = (
              await api.query.staking.erasStakers(era, address)
            ).toJSON() as any;
            const erasStakersPaged =
              (await api.query.staking.erasStakersPaged.entries(
                era,
                address,
              )) as any;
            const total =
              erasStakersPaged?.[0]?.[1]?.toJSON()?.pageTotal ||
              erasStakers?.total ||
              '0';
            const validatorHistory = await this.kusamaMarkDB
              .getRepository(PolkadotValidatorEra)
              .createQueryBuilder()
              .where('CAST(era AS INT) > :era AND validator =:validator', {
                era: Number(era) - 7,
                validator: address,
              })
              .orderBy('era', 'DESC')
              .getMany();
            const { all_reward_points, active_time, all_reward_points_time } =
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
                  active_time: 0,
                  all_reward_points_time: 0,
                },
              );

            const slashingSpans = (
              await api.query.staking.slashingSpans(address)
            ).toJSON() as any;
            const average_reward_points = new BigNumber(all_reward_points)
              .div(all_reward_points_time || 1)
              .toFixed();
            const active_rate = new BigNumber(active_time).div(7).toFixed();
            const rank = new BigNumber(average_reward_points)
              .multipliedBy(renderPoint(identity?.judgements?.[0]?.[1]))
              .multipliedBy(100 - commission.split('.')[0])
              .multipliedBy(
                0.9 +
                  Math.pow(
                    new BigNumber(active_time).div(7).toNumber(),
                    1 / 3,
                  ) /
                    10,
              )
              .div(kusamaEra.min_bond)
              .div(
                0.9,
                // new BigNumber(approvalStake[address] || '0')
                //   .div(kusamaEra.min_approval_stake)
                //   .toNumber(),
              )
              .multipliedBy(1000000000)
              .toString();

            return {
              id: address + '-' + era,
              validator: address,
              era,
              nominator: '0',
              total_bond: new BigNumber(total).toString(),
              is_active,
              reward_points,
              identity_level: identity?.judgements?.[0]?.[1],
              commission,
              last_nonzero_slash: slashingSpans?.lastNonzeroSlash,
              average_reward_points,
              active_rate,
              rank,
            };
          } else return null;
        }),
      );

      const validatorsEraData = [
        ...validatorsActiveEraData.filter((item) => item),
        ...validatorsWaitEraData.filter((item) => item),
      ] as any;

      await this.kusamaMarkDB
        .getRepository(PolkadotValidatorEra)
        .save(validatorsEraData, { chunk: 100 });
      await this.kusamaMarkDB.getRepository(PolkadotEra).save(kusamaEra);

      console.log(`${era} scan finished!`);
    }

    console.log('polkadot staking scan finished!');
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
