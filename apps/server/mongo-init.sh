#!/bin/bash
mongosh <<EOF
rs.initiate()
EOF