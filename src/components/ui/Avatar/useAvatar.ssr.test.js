import { renderHook } from '@testing-library/react';
import { useAvatar } from './useAvatar';

describe('useAvatar (SSR-safety)', () => {
  it('never touches localStorage or Math.random when computing the color', () => {
    const getItemSpy = jest.spyOn(Storage.prototype, 'getItem');
    const setItemSpy = jest.spyOn(Storage.prototype, 'setItem');
    const randomSpy = jest.spyOn(Math, 'random');

    const { result } = renderHook(() => useAvatar());
    result.current.getColorByText('João Silva');

    expect(getItemSpy).not.toHaveBeenCalled();
    expect(setItemSpy).not.toHaveBeenCalled();
    expect(randomSpy).not.toHaveBeenCalled();

    getItemSpy.mockRestore();
    setItemSpy.mockRestore();
    randomSpy.mockRestore();
  });

  it('is deterministic: the same text returns the same color across independent calls', () => {
    const { result: firstMount } = renderHook(() => useAvatar());
    const { result: secondMount } = renderHook(() => useAvatar());

    const colorFromFirstMount = firstMount.current.getColorByText('Ana Costa');
    const colorFromSecondMount =
      secondMount.current.getColorByText('Ana Costa');

    expect(colorFromFirstMount).toBe(colorFromSecondMount);
  });

  it('distinguishes different texts by mapping them to different palette indices', () => {
    const { result } = renderHook(() => useAvatar());

    const colorJoao = result.current.getColorByText('João Silva');
    const colorMaria = result.current.getColorByText('Maria Santos');
    const colorPedro = result.current.getColorByText('Pedro Oliveira');

    expect(colorJoao).toBe('bg-orange-500 text-white');
    expect(colorMaria).toBe('bg-pink-500 text-white');
    expect(colorPedro).toBe('bg-teal-500 text-white');
  });
});
