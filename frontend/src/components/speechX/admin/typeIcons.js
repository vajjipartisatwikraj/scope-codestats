import { BookOpenTextIcon } from "@phosphor-icons/react/dist/csr/BookOpenText";
import { RepeatIcon } from "@phosphor-icons/react/dist/csr/Repeat";
import { ShuffleIcon } from "@phosphor-icons/react/dist/csr/Shuffle";
import { ChatCircleDotsIcon } from "@phosphor-icons/react/dist/csr/ChatCircleDots";
import { BookBookmarkIcon } from "@phosphor-icons/react/dist/csr/BookBookmark";
import { TextTIcon } from "@phosphor-icons/react/dist/csr/TextT";
import { ListChecksIcon } from "@phosphor-icons/react/dist/csr/ListChecks";
import { EnvelopeIcon } from "@phosphor-icons/react/dist/csr/Envelope";

/** One Phosphor icon per section type, for the type picker and the section rows of the editor. */
export const SECTION_TYPE_ICON = {
  READING: BookOpenTextIcon,
  REPEAT: RepeatIcon,
  JUMBLED: ShuffleIcon,
  QUESTION_ANSWER: ChatCircleDotsIcon,
  STORYTELLING: BookBookmarkIcon,
  FILL_BLANKS: TextTIcon,
  MCQ: ListChecksIcon,
  EMAIL_WRITING: EnvelopeIcon,
};
