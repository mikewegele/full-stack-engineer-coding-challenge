import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { CurrentUser, JwtAuthGuard, Roles, RolesGuard } from '@sandbox/auth';
import { JwtPayload, UserRole } from '@sandbox/types';

import { QueryPricingCatalogsDto } from './dto/query-pricing-catalogs.dto';
import { PricingCatalogsService } from './pricing-catalogs.service';
import { PricingCatalogResponseDto } from './dto/pricing-catalog-response.dto';
import { CreatePricingCatalogDto } from './dto/create-pricing-catalog.dto';
import { UpdatePricingCatalogDto } from './dto/update-pricing-catalog.dto';
import { QuoteResult } from './quote/quote.types';
import { QuoteRequestDto } from './dto/quote-request.dto';

@ApiTags('Pricing Catalogs')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('pricing-catalogs')
export class PricingCatalogsController {
  constructor(private readonly service: PricingCatalogsService) {}

  @Get()
  @Roles(UserRole.ADMIN, UserRole.CRAFTSMAN)
  @ApiOperation({ summary: 'List pricing catalog versions' })
  @ApiResponse({ status: 200, description: 'Pricing catalog versions, newest first' })
  list(
    @Query() query: QueryPricingCatalogsDto,
    @CurrentUser() user: JwtPayload,
  ): Promise<PricingCatalogResponseDto[]> {
    return this.service.list(query, user);
  }

  @Get(':versionId')
  @Roles(UserRole.ADMIN, UserRole.CRAFTSMAN)
  @ApiOperation({ summary: 'Get one pricing catalog by version' })
  @ApiResponse({ status: 200, type: PricingCatalogResponseDto })
  @ApiResponse({ status: 403, description: 'Caller may not access this pricing catalog' })
  @ApiResponse({ status: 404, description: 'Pricing catalog version not found' })
  findOne(
    @Param('versionId', ParseUUIDPipe) versionId: string,
    @CurrentUser() user: JwtPayload,
  ): Promise<PricingCatalogResponseDto> {
    return this.service.findOne(versionId, user);
  }

  @Post()
  @Roles(UserRole.ADMIN, UserRole.CRAFTSMAN)
  @ApiOperation({ summary: 'Create a draft pricing catalog version' })
  @ApiResponse({ status: 201, type: PricingCatalogResponseDto })
  @ApiResponse({
    status: 403,
    description: 'Caller may not create a catalog for this craftsman',
  })
  @ApiResponse({ status: 404, description: 'Craftsman not found' })
  create(
    @Body() dto: CreatePricingCatalogDto,
    @CurrentUser() user: JwtPayload,
  ): Promise<PricingCatalogResponseDto> {
    return this.service.create(dto, user);
  }

  @Patch(':versionId')
  @Roles(UserRole.ADMIN, UserRole.CRAFTSMAN)
  @ApiOperation({ summary: 'Update a draft pricing catalog version' })
  @ApiResponse({ status: 200, type: PricingCatalogResponseDto })
  @ApiResponse({ status: 400, description: 'Pricing catalog attributes are invalid' })
  @ApiResponse({ status: 403, description: 'Caller may not update this pricing catalog' })
  @ApiResponse({ status: 404, description: 'Pricing catalog version not found' })
  update(
    @Param('versionId', ParseUUIDPipe) versionId: string,
    @Body() dto: UpdatePricingCatalogDto,
    @CurrentUser() user: JwtPayload,
  ): Promise<PricingCatalogResponseDto> {
    return this.service.updateDraft(versionId, dto, user);
  }

  @Post(':versionId/quote')
  @Roles(UserRole.ADMIN, UserRole.CRAFTSMAN)
  @ApiOperation({ summary: 'Calculate a quote for an exact pricing catalog version' })
  @ApiResponse({ status: 200, description: 'Calculated quote breakdown' })
  @ApiResponse({ status: 400, description: 'Quote request is invalid' })
  @ApiResponse({ status: 403, description: 'Caller may not quote this pricing catalog' })
  @ApiResponse({ status: 404, description: 'Pricing catalog version not found' })
  createQuote(
    @Param('versionId', ParseUUIDPipe) versionId: string,
    @Body() dto: QuoteRequestDto,
    @CurrentUser() user: JwtPayload,
  ): Promise<QuoteResult> {
    return this.service.quoteVersion(versionId, dto, user);
  }

  @Post(':versionId/publish')
  @Roles(UserRole.ADMIN, UserRole.CRAFTSMAN)
  @ApiOperation({ summary: 'Publish a draft pricing catalog version' })
  @ApiResponse({ status: 200, type: PricingCatalogResponseDto })
  @ApiResponse({ status: 400, description: 'Only draft pricing catalogs can be published' })
  @ApiResponse({ status: 403, description: 'Caller may not publish this pricing catalog' })
  @ApiResponse({ status: 404, description: 'Pricing catalog version not found' })
  publish(
    @Param('versionId', ParseUUIDPipe) versionId: string,
    @CurrentUser() user: JwtPayload,
  ): Promise<PricingCatalogResponseDto> {
    return this.service.publish(versionId, user);
  }
}
