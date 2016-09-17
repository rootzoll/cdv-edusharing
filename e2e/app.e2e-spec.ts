import { Ccdesktop2Page } from './app.po';

describe('ccdesktop2 App', function() {
  let page: Ccdesktop2Page;

  beforeEach(() => {
    page = new Ccdesktop2Page();
  });

  it('should display message saying app works', () => {
    page.navigateTo();
    expect(page.getParagraphText()).toEqual('app works!');
  });
});
