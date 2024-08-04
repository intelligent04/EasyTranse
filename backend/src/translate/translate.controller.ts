import { Body, Controller, Get, Post } from '@nestjs/common';
import { TranslateService } from './translate.service';
import { TranslateDto } from './translate.dto';

@Controller('translate')
export class TranslateController {
  constructor(private readonly translateService: TranslateService) {}

  @Post()
  async getResult(@Body() translateDto: TranslateDto): Promise<string[]> {
    return await this.translateService.getResult(translateDto);
  }
}
