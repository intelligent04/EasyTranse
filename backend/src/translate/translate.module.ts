import { Module } from '@nestjs/common';
import { TranslateController } from './translate.controller';
import { TranslateService } from './translate.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Translate } from 'src/entities/translate.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Translate])],
  controllers: [TranslateController],
  providers: [TranslateService],
})
export class TranslateModule {}
