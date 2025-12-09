import { Test, TestingModule } from '@nestjs/testing';
import { HomeCareService } from './home-care.service';

describe('HomeCareService', () => {
  let service: HomeCareService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [HomeCareService],
    }).compile();

    service = module.get<HomeCareService>(HomeCareService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
