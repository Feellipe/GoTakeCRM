#!/usr/bin/env python3
import os, base64

def wf(p, c):
    d = os.path.dirname(p)
    if d and not os.path.exists(d):
        os.makedirs(d, exist_ok=True)
    with open(p, "w", encoding="utf-8") as f:
        f.write(c)
    print("Written:", p)

files = {}
