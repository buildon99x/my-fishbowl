export function renderDecoration() {
  return `
    <svg class="aquarium-art" viewBox="0 0 1152 780" role="img" aria-label="Glass fishbowl with water and goldfish">
      <defs>
        <clipPath id="bowl-shape">
          <path d="M180 68 C204 32 941 34 972 68 C984 83 979 154 949 177 C1065 279 1116 404 1091 523 C1057 685 878 769 583 769 C287 769 113 672 77 515 C50 398 96 278 213 177 C181 148 169 88 180 68 Z" />
        </clipPath>
        <clipPath id="bowl-clip" clipPathUnits="objectBoundingBox">
          <path d="M0.122 0.049 C0.145 0 0.836 0.003 0.865 0.049 C0.876 0.069 0.872 0.166 0.843 0.197 C0.952 0.335 1 0.505 0.977 0.666 C0.945 0.886 0.777 1 0.5 1 C0.222 1 0.059 0.869 0.025 0.655 C0 0.497 0.043 0.334 0.153 0.197 C0.123 0.157 0.112 0.076 0.122 0.049 Z" />
        </clipPath>
        <clipPath id="water-shape">
          <path d="M118 142 C238 118 341 164 455 142 C571 119 656 166 774 142 C856 126 916 141 972 158 C1066 260 1116 403 1091 523 C1057 685 878 769 583 769 C287 769 113 672 77 515 C50 397 71 244 118 142 Z" />
        </clipPath>
      </defs>

      <g clip-path="url(#bowl-shape)">
        <rect x="180" y="34" width="792" height="84" fill="#80caf0" />
        <ellipse cx="576" cy="70" rx="398" ry="52" fill="#9ccfed" />
        <path d="M180 68 C204 32 941 34 972 68 C984 83 979 154 949 177 C1065 279 1116 404 1091 523 C1057 685 878 769 583 769 C287 769 113 672 77 515 C50 398 96 278 213 177 C181 148 169 88 180 68 Z" fill="#b8dcf3" />
        <path d="M118 142 C238 118 341 164 455 142 C571 119 656 166 774 142 C856 126 916 141 972 158 C1066 260 1116 403 1091 523 C1057 685 878 769 583 769 C287 769 113 672 77 515 C50 397 71 244 118 142 Z" fill="#58bdd4" />
        <g clip-path="url(#water-shape)">
          <path d="M181 190 C267 127 369 211 476 178 C608 137 680 217 817 174 C894 151 943 173 1000 241 C942 158 856 167 779 198 C661 246 587 158 453 194 C334 227 265 157 181 190 Z" fill="#7bc7dc" opacity="0.58" />
          <path d="M205 210 C258 112 257 583 544 691 C695 748 409 790 238 641 C105 526 128 299 205 210 Z" fill="#49aeca" opacity="0.42" />
        </g>

        <g class="aquarium-ground" aria-hidden="true">
          <path class="sand-bed" d="M169 650 C301 602 418 646 566 621 C745 590 887 609 999 662 C920 736 758 769 582 768 C398 767 250 731 169 650 Z" />
          <g class="sway-plant sway-plant-left">
            <path d="M306 654 C289 606 303 562 277 520 C253 480 269 431 249 392" />
            <path d="M321 654 C324 602 357 573 354 523 C351 473 391 441 390 398" />
            <path d="M336 655 C360 618 383 590 395 546 C407 500 456 492 464 449" />
          </g>
          <g class="sway-plant sway-plant-right">
            <path d="M818 657 C798 616 817 578 790 535 C765 496 775 459 746 421" />
            <path d="M838 657 C850 606 879 579 869 530 C860 486 895 451 888 409" />
          </g>
          <g class="garden-eel garden-eel-one">
            <path d="M514 650 C495 603 501 562 527 523 C548 491 541 458 520 428" />
            <circle cx="512" cy="424" r="4" />
            <circle cx="529" cy="425" r="4" />
          </g>
          <g class="garden-eel garden-eel-two">
            <path d="M642 651 C666 612 674 572 653 532 C635 498 653 469 681 444" />
            <circle cx="676" cy="438" r="4" />
            <circle cx="690" cy="447" r="4" />
          </g>
          <path class="sand-cover" d="M151 665 C286 618 418 655 564 631 C753 600 902 622 1020 675 C934 740 763 771 582 769 C394 767 238 733 151 665 Z" />
          <ellipse class="sand-glint" cx="418" cy="665" rx="118" ry="18" />
          <ellipse class="sand-glint sand-glint-right" cx="782" cy="663" rx="154" ry="22" />
        </g>

<path d="M936 112 C970 113 980 116 970 139 C956 172 925 207 914 191 C907 181 927 129 936 112 Z" fill="#e6f5ff" opacity="0.85" />
        <path d="M935 224 C994 228 1072 340 1035 394 C1006 436 965 267 935 224 Z" fill="#e6f5ff" opacity="0.7" />
        <ellipse cx="1071" cy="458" rx="25" ry="36" fill="#e6f5ff" opacity="0.52" />
        <path d="M180 68 C204 32 941 34 972 68 C984 83 979 154 949 177 C1065 279 1116 404 1091 523 C1057 685 878 769 583 769 C287 769 113 672 77 515 C50 398 96 278 213 177 C181 148 169 88 180 68 Z" fill="none" stroke="#e6f5ff" stroke-width="16" stroke-linejoin="round" opacity="0.78" />
        <path d="M183 72 C226 39 923 42 969 72" fill="none" stroke="#f7fcff" stroke-width="9" stroke-linecap="round" opacity="0.86" />
        <path d="M181 69 C205 33 941 35 971 69" fill="none" stroke="#498aa8" stroke-width="4" stroke-linecap="round" opacity="0.32" />
      </g>
    </svg>
  `;
}
