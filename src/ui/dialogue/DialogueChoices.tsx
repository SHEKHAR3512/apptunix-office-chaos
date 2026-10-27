import { getGame } from "../App";

export function DialogueChoices({ choices }: { choices: string[] }) {
  const g = getGame();
  return (
    <div className="dlg-choices">
      {choices.map((c, i) => (
        <button key={i} className="dlg-choice" onClick={() => g?.life.advanceDialogue(i)}>
          <span className="dlg-key">{i + 1}</span>{c}
        </button>
      ))}
    </div>
  );
}
