import { Column, Entity, PrimaryGeneratedColumn, PrimaryColumn } from 'typeorm';

@Entity()
export class StakingErapaids {
  @PrimaryGeneratedColumn()
  id: string;
  @Column()
  era_index: string;
  @Column()
  block_height: number;
}

@Entity()
export class KusamaEra {
  @PrimaryColumn()
  era: string;
  @Column()
  average_reward_points: string;
  @Column()
  average_bond: string;
  @Column()
  min_bond: string;
  @Column()
  min_approval_stake: string;
}

@Entity()
export class PolkadotEra {
  @PrimaryColumn()
  era: string;
  @Column()
  average_reward_points: string;
  @Column()
  average_bond: string;
  @Column()
  min_bond: string;
  @Column()
  min_approval_stake: string;
}

@Entity()
export class MoonriverEra {
  @PrimaryColumn()
  era: string;
  @Column()
  average_reward_points: string;
  @Column()
  average_bond: string;
  @Column()
  min_bond: string;
}

@Entity()
export class MoonriverValidatorEra {
  @PrimaryColumn()
  id: string;
  @Column()
  era: string;
  @Column()
  is_active: boolean;
  @Column()
  identity_level: string;
  @Column()
  total_bond: string;
  @Column()
  reward_points: string;
  @Column()
  validator: string;
  @Column()
  average_reward_points: string;
  @Column()
  rank: string;
}

@Entity()
export class MoonbeamEra {
  @PrimaryColumn()
  era: string;
  @Column()
  average_reward_points: string;
  @Column()
  average_bond: string;
  @Column()
  min_bond: string;
}

@Entity()
export class MoonbeamValidatorEra {
  @PrimaryColumn()
  id: string;
  @Column()
  era: string;
  @Column()
  is_active: boolean;
  @Column()
  identity_level: string;
  @Column()
  total_bond: string;
  @Column()
  reward_points: string;
  @Column()
  validator: string;
  @Column()
  average_reward_points: string;
  @Column()
  rank: string;
}

@Entity()
export class KusamaValidatorEra {
  @PrimaryColumn()
  id: string;
  @Column()
  era: string;
  @Column()
  is_active: boolean;
  @Column()
  identity_level: string;
  @Column()
  total_bond: string;
  @Column()
  nominator: string;
  @Column()
  reward_points: string;
  @Column()
  last_nonzero_slash: string;
  @Column()
  commission: string;
  @Column()
  validator: string;
  @Column()
  average_reward_points: string;
  @Column()
  active_rate: string;
  @Column()
  rank: string;
}

@Entity()
export class PolkadotValidatorEra {
  @PrimaryColumn()
  id: string;
  @Column()
  era: string;
  @Column()
  is_active: boolean;
  @Column()
  identity_level: string;
  @Column()
  total_bond: string;
  @Column()
  nominator: string;
  @Column()
  reward_points: string;
  @Column()
  last_nonzero_slash: string;
  @Column()
  commission: string;
  @Column()
  validator: string;
  @Column()
  average_reward_points: string;
  @Column()
  active_rate: string;
  @Column()
  rank: string;
}
