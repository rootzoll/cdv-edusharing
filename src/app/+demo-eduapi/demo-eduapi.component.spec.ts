import {
  beforeEach,
  beforeEachProviders,
  describe,
  expect,
  it,
  inject,
} from '@angular/core/testing';
import { ComponentFixture, TestComponentBuilder } from '@angular/compiler/testing';
import { Component } from '@angular/core';
import { By } from '@angular/platform-browser';
import { DemoEduapiComponent } from './demo-eduapi.component';

describe('Component: DemoEduapi', () => {
  let builder: TestComponentBuilder;

  beforeEachProviders(() => [DemoEduapiComponent]);
  beforeEach(inject([TestComponentBuilder], function (tcb: TestComponentBuilder) {
    builder = tcb;
  }));

  it('should inject the component', inject([DemoEduapiComponent],
      (component: DemoEduapiComponent) => {
    expect(component).toBeTruthy();
  }));

  it('should create the component', inject([], () => {
    return builder.createAsync(DemoEduapiComponentTestController)
      .then((fixture: ComponentFixture<any>) => {
        let query = fixture.debugElement.query(By.directive(DemoEduapiComponent));
        expect(query).toBeTruthy();
        expect(query.componentInstance).toBeTruthy();
      });
  }));
});

@Component({
  selector: 'test',
  template: `
    <app-demo-eduapi></app-demo-eduapi>
  `,
  directives: [DemoEduapiComponent]
})
class DemoEduapiComponentTestController {
}

