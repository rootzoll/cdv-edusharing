import {
  beforeEachProviders,
  it,
  describe,
  expect,
  inject
} from '@angular/core/testing';
import { EduApiService } from './edu-api.service';

describe('EduApi Service', () => {
  beforeEachProviders(() => [EduApiService]);

  it('should ...',
      inject([EduApiService], (service: EduApiService) => {
    expect(service).toBeTruthy();
  }));
});
