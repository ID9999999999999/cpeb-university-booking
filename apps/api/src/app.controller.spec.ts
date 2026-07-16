import { Test, TestingModule } from '@nestjs/testing';
import { AppController } from './app.controller';
import { PrismaService } from './prisma/prisma.service';

describe('AppController', () => {
  let appController: AppController;

  const prismaMock = {
    $queryRaw: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const app: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [
        {
          provide: PrismaService,
          useValue: prismaMock,
        },
      ],
    }).compile();

    appController = app.get<AppController>(AppController);
  });

  describe('getRoot', () => {
    it('returns the API status', () => {
      expect(appController.getRoot()).toEqual({
        message: 'University Equipment Booking API',
        status: 'running',
      });
    });
  });

  describe('getHealth', () => {
    it('returns a healthy service response', () => {
      const result = appController.getHealth();

      expect(result.status).toBe('ok');
      expect(result.service).toBe('university-equipment-booking-api');
      expect(result.timestamp).toEqual(expect.any(String));
      expect(Number.isNaN(Date.parse(result.timestamp))).toBe(false);
    });
  });

  describe('getDatabaseHealth', () => {
    it('checks the database and returns a connected response', async () => {
      prismaMock.$queryRaw.mockResolvedValue([{ '?column?': 1 }]);

      const result = await appController.getDatabaseHealth();

      expect(prismaMock.$queryRaw).toHaveBeenCalledTimes(1);
      expect(result.status).toBe('ok');
      expect(result.database).toBe('connected');
      expect(result.provider).toBe('postgresql');
      expect(result.timestamp).toEqual(expect.any(String));
    });
  });
});
