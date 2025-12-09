import { Test, TestingModule } from '@nestjs/testing';
import { HomeCareController } from './home-care.user.controller';

describe('HomeCareController', () => {
  let controller: HomeCareController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [HomeCareController],
    }).compile();

    controller = module.get<HomeCareController>(HomeCareController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
