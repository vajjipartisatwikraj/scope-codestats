import { SpeakerSlashIcon } from "@phosphor-icons/react/dist/csr/SpeakerSlash";
import { HeadsetIcon } from "@phosphor-icons/react/dist/csr/Headset";
import { SpeakerHighIcon } from "@phosphor-icons/react/dist/csr/SpeakerHigh";
import { WifiHighIcon } from "@phosphor-icons/react/dist/csr/WifiHigh";
import { MicrophoneIcon } from "@phosphor-icons/react/dist/csr/Microphone";
import { TimerIcon } from "@phosphor-icons/react/dist/csr/Timer";

/** Tips shown on the instructions screen, in the order students see them. `Icon` is a Phosphor component. */
const instructionTips = [
  {
    id: "quiet",
    title: "Find a quiet place",
    description: "Background noise lowers your score. Choose a quiet room and keep other devices away.",
    Icon: SpeakerSlashIcon,
  },
  {
    id: "earphones",
    title: "Use wired earphones",
    description: "Earphones with a microphone give clearer audio and a steadier connection.",
    Icon: HeadsetIcon,
  },
  {
    id: "volume",
    title: "Keep volume high",
    description: "Set your volume high enough to hear every audio clip clearly.",
    Icon: SpeakerHighIcon,
  },
  {
    id: "internet",
    title: "Stable internet",
    description: "Connect to a strong network so your recordings upload smoothly.",
    Icon: WifiHighIcon,
  },
  {
    id: "microphone",
    title: "Allow microphone access",
    description: "Choose Allow when your browser asks. Spoken questions cannot be answered without it.",
    Icon: MicrophoneIcon,
  },
  {
    id: "stay",
    title: "Stay on the page",
    description:
      "Do not refresh, go back or close the tab during a section. Its timer runs only while you are inside it.",
    Icon: TimerIcon,
  },
];

export default instructionTips;
