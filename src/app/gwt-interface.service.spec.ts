import {
  beforeEachProviders,
  it,
  describe,
  expect,
  inject
} from '@angular/core/testing';
import { GwtInterfaceService } from './gwt-interface.service';

describe('GwtInterface Service', () => {
  beforeEachProviders(() => [GwtInterfaceService]);

  it('should ...',
      inject([GwtInterfaceService], (service: GwtInterfaceService) => {
    expect(service).toBeTruthy();
  }));
});
