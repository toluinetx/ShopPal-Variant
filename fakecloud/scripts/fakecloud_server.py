#!/usr/bin/env python3
"""Entry point for the ShopPal fakecloud AWS API emulator.

Thin wrapper around `moto_server` that applies the compatibility shims in
moto_patches.py first. Takes the same arguments as moto_server.

    python3 fakecloud_server.py -H 0.0.0.0 -p 4566
"""

import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import moto_patches  # noqa: E402


def main() -> int:
    for description in moto_patches.apply_all():
        print(f"[fakecloud] patch applied - {description}", file=sys.stderr)

    from moto.server import main as moto_main

    return moto_main()


if __name__ == "__main__":
    sys.exit(main())
