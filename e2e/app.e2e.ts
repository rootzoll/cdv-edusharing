import { CCDesktop2Page } from './app.po';

describe('ccdesktop2 App', function() {
  let page: CCDesktop2Page;

  beforeEach(() => {
    page = new CCDesktop2Page();
  });

  it('should display message saying app works', () => {
    page.navigateTo();
    expect(page.getParagraphText()).toEqual('ccdesktop2 works!');
  });
});
