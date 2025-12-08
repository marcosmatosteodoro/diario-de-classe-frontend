import { useAvatar } from './useAvatar';

export const Avatar = ({ text }) => {
  const { getTitleByText, getColorByText, getKeyByText } = useAvatar();
  const title = getTitleByText(text);
  const colorClass = getColorByText(text);
  const id = getKeyByText(text);
  return (
    <div
      key={id}
      id={id}
      className={`w-14 h-14 rounded-full ${colorClass} flex items-center justify-center text-lg font-bold`}
      data-testid="avatar-component"
    >
      {title}
    </div>
  );
};
