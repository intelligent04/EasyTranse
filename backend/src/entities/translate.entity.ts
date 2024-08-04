import { BaseEntity, Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity({ name: 'translate' })
export class Translate extends BaseEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ nullable: false })
  language: string;

  @Column({ nullable: false })
  hash: string;

  @Column({ nullable: false })
  content: string;
}
