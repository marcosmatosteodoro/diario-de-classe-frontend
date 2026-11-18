import { reloadPage } from './reloadPage';

describe('reloadPage', () => {
  it('chama location.reload da janela injetada uma vez', () => {
    const reload = jest.fn();
    reloadPage({ location: { reload } });
    expect(reload).toHaveBeenCalledTimes(1);
  });
});
