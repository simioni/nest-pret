import { Controller, Get } from '@nestjs/common';
import { ApiOperation } from '@nestjs/swagger';
import {
  HealthCheckService,
  HealthCheck,
  MongooseHealthIndicator,
  MemoryHealthIndicator,
} from '@nestjs/terminus';

@Controller('health')
export class HealthController {
  constructor(
    private health: HealthCheckService,
    private db: MongooseHealthIndicator,
    private ram: MemoryHealthIndicator,
  ) {}

  @Get('/replica')
  @ApiOperation({
    summary:
      'A route to check if an individual replica of the API is ready and listening for requests.',
    description:
      "This route always return a successful result. If the replica is unhealthy, this route won't be reachable at all. If this route can't be reached, the container orchestration will try to replace this replica with a new one.",
  })
  checkReplica() {
    return {
      status: 'ok',
    };
  }

  @Get('/readiness')
  @ApiOperation({
    summary: 'A route to perform a health check on the replica.',
    description:
      'This route will check if the DB connection is alive, and if the memory usage of the app is within limits.',
  })
  @HealthCheck()
  checkReadiness() {
    return this.health.check([
      () => this.db.pingCheck('db'),
      () => this.ram.checkHeap('heap', 150 * 1024 * 1024),
    ]);
  }
}
