import VolumeOffOutlinedIcon from "@mui/icons-material/VolumeOffOutlined";
import HeadsetMicOutlinedIcon from "@mui/icons-material/HeadsetMicOutlined";
import VolumeUpOutlinedIcon from "@mui/icons-material/VolumeUpOutlined";
import WifiRoundedIcon from "@mui/icons-material/WifiRounded";
import MicNoneOutlinedIcon from "@mui/icons-material/MicNoneOutlined";
import TimerOutlinedIcon from "@mui/icons-material/TimerOutlined";

/** Tips shown on the instructions screen, in the order students see them. */
const instructionTips = [
  {
    id: "quiet",
    title: "Find a quiet place",
    description: "Background noise lowers your score. Choose a quiet room and keep other devices away.",
    Icon: VolumeOffOutlinedIcon,
  },
  {
    id: "earphones",
    title: "Use wired earphones",
    description: "Earphones with a microphone give clearer audio and a steadier connection.",
    Icon: HeadsetMicOutlinedIcon,
  },
  {
    id: "volume",
    title: "Keep volume high",
    description: "Set your volume high enough to hear every audio clip clearly.",
    Icon: VolumeUpOutlinedIcon,
  },
  {
    id: "internet",
    title: "Stable internet",
    description: "Connect to a strong network so your recordings upload smoothly.",
    Icon: WifiRoundedIcon,
  },
  {
    id: "microphone",
    title: "Allow microphone access",
    description: "Choose Allow when your browser asks. Spoken questions cannot be answered without it.",
    Icon: MicNoneOutlinedIcon,
  },
  {
    id: "stay",
    title: "Stay on the page",
    description:
      "Do not refresh, go back or close the tab during a section. Its timer runs only while you are inside it.",
    Icon: TimerOutlinedIcon,
  },
];

export default instructionTips;
