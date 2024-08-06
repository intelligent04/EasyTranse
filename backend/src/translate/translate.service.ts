import { Injectable } from '@nestjs/common';
import { TranslateDto } from './translate.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Translate } from 'src/entities/translate.entity';
import * as crypto from 'crypto';
import axios from 'axios';

@Injectable()
export class TranslateService {
  constructor(
    @InjectRepository(Translate)
    private translateRepository: Repository<Translate>,
  ) {}

  getHash(str: string): string {
    return crypto.createHash('sha256').update(str).digest('hex');
  }

  async getResult(translateDto: TranslateDto): Promise<TranslateDto> {
    let { strs, language } = translateDto;

    let cache: {
      index: number;
      content: string;
    }[] = [];
    for (let i = 0; i < strs.length; i++) {
      let result = await this.translateRepository.findOneBy({
        hash: this.getHash(strs[i]),
        language,
      });
      if (result) {
        cache.push({
          index: i,
          content: result.content,
        });
      }
    }

    for (let i of cache.reverse()) {
      strs.splice(i.index, 1);
    }

    let body = translateDto;

    if (strs.length > 0) {
      let resp = await axios.post(
        process.env.AI_API,
        {
          strs,
          language,
        },
        {
          headers: {
            'Content-Type': 'application/json',
          },
        },
      );

      if (strs.length !== body.strs.length) {
        throw new Error('Invalid AI_API response');
      }

      body = resp.data as TranslateDto;
    }

    for (let i = 0; i < strs.length; i++) {
      let hash = this.getHash(strs[i]);
      let content = body.strs[i];
      await this.translateRepository.save({
        hash,
        content,
        language,
      });
    }

    for (let i of cache) {
      body.strs.splice(i.index, 0, i.content);
    }

    return body;
  }
}
