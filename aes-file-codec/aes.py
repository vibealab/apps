#!/usr/bin/env python3
# aes.py - AES file encrypt/decrypt using system OpenSSL (no Python crypto deps)
#
# Requires: openssl CLI installed and available in PATH
#
# Examples:
#   python aes.py encrypt --password xxx file1 file2 file3
#   python aes.py decrypt --password xxx file1.aes file2.aes file3.aes
#
# Safer (doesn't expose password in process args):
#   python aes.py encrypt --prompt file1
#   python aes.py decrypt --prompt file1.aes

import argparse
import os
import sys
import subprocess
from getpass import getpass

DEFAULT_ITER = 200_000

def run_openssl(openssl_bin, args, password: str):
    # Pass password via stdin so it doesn't show up in process list
    p = subprocess.run(
        [openssl_bin] + args + ["-pass", "stdin"],
        input=(password + "\n").encode("utf-8"),
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
    )
    if p.returncode != 0:
        raise RuntimeError(p.stderr.decode("utf-8", errors="replace").strip())

def encrypt_file(openssl_bin, infile: str, password: str, force: bool, iterations: int) -> str:
    if not os.path.isfile(infile):
        raise FileNotFoundError(f"Input not found: {infile}")

    outfile = infile + ".aes"
    if os.path.exists(outfile) and not force:
        raise FileExistsError(f"Output exists (use --force): {outfile}")

    args = [
        "enc",
        "-aes-256-cbc",
        "-pbkdf2",
        "-iter", str(iterations),
        "-md", "sha256",
        "-salt",
        "-in", infile,
        "-out", outfile,
    ]
    run_openssl(openssl_bin, args, password)
    return outfile

def decrypt_file(openssl_bin, infile: str, password: str, force: bool, iterations: int) -> str:
    if not infile.endswith(".aes"):
        raise ValueError(f"Expected a .aes file: {infile}")
    if not os.path.isfile(infile):
        raise FileNotFoundError(f"Input not found: {infile}")

    outfile = infile[:-4]
    if os.path.exists(outfile) and not force:
        raise FileExistsError(f"Output exists (use --force): {outfile}")

    args = [
        "enc",
        "-d",
        "-aes-256-cbc",
        "-pbkdf2",
        "-iter", str(iterations),
        "-md", "sha256",
        "-in", infile,
        "-out", outfile,
    ]
    run_openssl(openssl_bin, args, password)
    return outfile

def parse_args(argv):
    p = argparse.ArgumentParser(description="Encrypt/decrypt files using OpenSSL AES (no Python crypto deps).")
    p.add_argument("--openssl", default="openssl", help="Path to openssl binary (default: openssl)")

    sub = p.add_subparsers(dest="command", required=True)

    def add_common(sp):
        sp.add_argument("files", nargs="+", help="Input files")
        sp.add_argument("--password", help="Password (warning: may be visible via shell history/process tools)")
        sp.add_argument("--prompt", action="store_true", help="Prompt for password")
        sp.add_argument("--force", action="store_true", help="Overwrite output files if they exist")
        sp.add_argument("--iterations", type=int, default=DEFAULT_ITER, help="PBKDF2 iterations")

    enc = sub.add_parser("encrypt", help="Encrypt to *.aes")
    add_common(enc)

    dec = sub.add_parser("decrypt", help="Decrypt *.aes back to original names")
    add_common(dec)

    return p.parse_args(argv)

def get_password(args) -> str:
    if args.prompt:
        pw1 = getpass("Password: ")
        if args.command == "encrypt":
            pw2 = getpass("Confirm: ")
            if pw1 != pw2:
                raise ValueError("Passwords do not match.")
        return pw1
    if args.password is None:
        raise ValueError("Provide --password or use --prompt.")
    return args.password

def main(argv=None) -> int:
    args = parse_args(argv or sys.argv[1:])
    password = get_password(args)

    ok = True
    for f in args.files:
        try:
            if args.command == "encrypt":
                out = encrypt_file(args.openssl, f, password, args.force, args.iterations)
            else:
                out = decrypt_file(args.openssl, f, password, args.force, args.iterations)
            print(f"{f} -> {out}")
        except Exception as e:
            ok = False
            print(f"Error processing {f}: {e}", file=sys.stderr)

    return 0 if ok else 2

if __name__ == "__main__":
    raise SystemExit(main())
