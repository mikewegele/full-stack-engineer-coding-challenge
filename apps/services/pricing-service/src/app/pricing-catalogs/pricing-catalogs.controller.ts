import { Controller, Get, Param, ParseUUIDPipe, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { CurrentUser, JwtAuthGuard, Roles, RolesGuard } from '@sandbox/auth';
import { JwtPayload, UserRole } from '@sandbox/types';

import { QueryPricingCatalogsDto } from './dto/query-pricing-catalogs.dto';
import { PricingCatalogsService } from './pricing-catalogs.service';
import { PricingCatalogResponseDto } from './dto/pricing-catalog-response.dto';

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
  list(@Query() query: QueryPricingCatalogsDto, @CurrentUser() user: JwtPayload) {
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
}
