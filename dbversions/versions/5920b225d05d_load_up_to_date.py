"""load up to date

Revision ID: 5920b225d05d
Revises: None
Create Date: 2012-06-17 21:26:51.865959

"""

# revision identifiers, used by Alembic.
revision = '5920b225d05d'
down_revision = None

from alembic import op
from datetime import datetime
import sqlalchemy as sa


def upgrade():
    ### commands auto generated by Alembic - please adjust! ###
    op.create_table('users',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('username', sa.Unicode(length=255), nullable=True),
        sa.Column('name', sa.Unicode(length=255), nullable=True),
        # The password field is really a mapped _password field. Think this is
        # where the CheckConstraints come from.
        sa.Column('password', sa.Unicode(length=60), nullable=True),
        sa.Column('email', sa.Unicode(length=255), nullable=True),
        sa.Column('activated', sa.Boolean(), nullable=True),
        sa.Column('is_admin', sa.Boolean(), nullable=True),
        sa.Column('last_login', sa.DateTime(), nullable=True),
        sa.Column('signup', sa.DateTime(), nullable=True),
        sa.Column('api_key', sa.Unicode(length=12), nullable=True),
        sa.Column('invite_ct', sa.Integer(), nullable=True),
        sa.Column('invited_by', sa.Unicode(length=255), nullable=True),
        sa.CheckConstraint('TODO'),
        sa.CheckConstraint('TODO'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('email'),
        sa.UniqueConstraint('username')
    )

    op.create_table('tags',
        sa.Column('tid', sa.Integer(), nullable=False),
        sa.Column('name', sa.Unicode(length=255), nullable=True),
        sa.PrimaryKeyConstraint('tid'),
        sa.UniqueConstraint('name')
    )

    op.create_table('url_hash',
        sa.Column('hash_id', sa.Unicode(length=22), nullable=False),
        sa.Column('url', sa.UnicodeText(), nullable=True),
        sa.Column('clicks', sa.Integer(), nullable=True),
        sa.PrimaryKeyConstraint('hash_id')
    )

    op.create_table('bmarks',
        sa.Column('bid', sa.Integer(), nullable=False),
        sa.Column('hash_id', sa.Unicode(length=22), nullable=True),
        sa.Column('description', sa.UnicodeText(), nullable=True),
        sa.Column('extended', sa.UnicodeText(), nullable=True),
        sa.Column('stored', sa.DateTime(), nullable=True),
        sa.Column('updated', sa.DateTime(), nullable=True),
        sa.Column('clicks', sa.Integer(), nullable=True),
        sa.Column('inserted_by', sa.Unicode(length=255), nullable=True),
        sa.Column('username', sa.Unicode(length=255), nullable=False),
        sa.Column('tag_str', sa.UnicodeText(), nullable=True),
        sa.ForeignKeyConstraint(['hash_id'], ['url_hash.hash_id'], ),
        sa.ForeignKeyConstraint(['username'], ['users.username'], ),
        sa.PrimaryKeyConstraint('bid'),
        sa.UniqueConstraint('hash_id')
    )

    op.create_table(u'activations',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('code', sa.Unicode(length=60), nullable=True),
        sa.Column('valid_until', sa.DateTime(), nullable=True),
        sa.Column('created_by', sa.Unicode(length=255), nullable=True),
        sa.ForeignKeyConstraint(['id'], ['users.id'], ),
        sa.PrimaryKeyConstraint('id')
    )

    op.create_table('bmark_tags',
        sa.Column('bmark_id', sa.Integer(), nullable=False),
        sa.Column('tag_id', sa.Integer(), nullable=False),
        sa.ForeignKeyConstraint(['bmark_id'], ['bmarks.bid'], ),
        sa.ForeignKeyConstraint(['tag_id'], ['tags.tid'], ),
        sa.PrimaryKeyConstraint('bmark_id', 'tag_id')
    )

    op.create_table('bmark_readable',
        sa.Column('bid', sa.Integer(), nullable=False),
        sa.Column('hash_id', sa.Unicode(length=22), nullable=True),
        sa.Column('content', sa.UnicodeText(), nullable=True),
        sa.Column('clean_content', sa.UnicodeText(), nullable=True),
        sa.Column('imported', sa.DateTime(), nullable=True),
        sa.Column('content_type', sa.Unicode(length=255), nullable=True),
        sa.Column('status_code', sa.Integer(), nullable=True),
        sa.Column('status_message', sa.Unicode(length=255), nullable=True),
        sa.ForeignKeyConstraint(['bid'], ['bmarks.bid'], ),
        sa.ForeignKeyConstraint(['hash_id'], ['bmarks.hash_id'], ),
        sa.PrimaryKeyConstraint('bid')
    )
    ### end Alembic commands ###


def downgrade():
    ### commands auto generated by Alembic - please adjust! ###
    op.drop_table('bmark_readable')
    op.drop_table('bmark_tags')
    op.drop_table(u'activations')
    op.drop_table('bmarks')
    op.drop_table('url_hash')
    op.drop_table('tags')
    op.drop_table('users')
    ### end Alembic commands ###
