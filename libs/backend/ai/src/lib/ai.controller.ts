
import { Controller, Post, Body, UploadedFile, UseInterceptors, BadRequestException } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { AiService } from './ai.service';

@Controller('ai')
export class AiController {
    constructor(private readonly aiService: AiService) { }

    @Post('math/text')
    async convertMathText(@Body('text') text: string) {
        if (!text) throw new BadRequestException('Text is required');
        const latex = await this.aiService.convertMathToLatex(text);
        return { latex };
    }

    @Post('math/image')
    @UseInterceptors(FileInterceptor('image'))
    async convertMathImage(@UploadedFile() file: any, @Body('image') imageBase64?: string) {
        let base64 = imageBase64;

        if (file) {
            base64 = `data:${file.mimetype};base64,${file.buffer.toString('base64')}`;
        }

        if (!base64) {
            throw new BadRequestException('Image file or base64 string is required');
        }

        const latex = await this.aiService.convertImageToLatex(base64);
        return { latex };
    }
}
